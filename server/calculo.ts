/**
 * Contexto de cálculo compartido por /admin/dia, /admin/personas y /admin/reporte.
 * Carga marcas, ajustes, faltas y horarios una sola vez y los indexa en memoria.
 */
import {
  calcularDia,
  resolverHorarioReferencia,
  seleccionarHorarioEspecial,
  type ResultadoDia,
  type ReglaHorarioEspecial,
} from "@/lib/motor-horas";
import { fechaLocal } from "@/lib/tz";
import {
  obtenerUsuariosActivos,
  obtenerConfig,
  obtenerHorariosEspeciales,
  obtenerMarcasRango,
  obtenerAjustesRango,
  obtenerFaltasRango,
  type AjusteManual,
  type ConfigSistema,
  type Marca,
  type Usuario,
} from "./queries";

export interface ContextoCalculo {
  config: ConfigSistema;
  usuarios: Usuario[];
  reglasHorario: ReglaHorarioEspecial[];
  /** marcas indexadas por `${usuarioId}|${fecha}` */
  marcas: Map<string, Marca[]>;
  /** ajustes indexados por `${usuarioId}|${fecha}` */
  ajustes: Map<string, AjusteManual>;
  /** faltas indexadas por `${usuarioId}|${fecha}` */
  faltas: Map<string, { justificada: boolean; motivo: string | null }>;
}

function clave(usuarioId: string, fecha: string): string {
  return `${usuarioId}|${fecha}`;
}

/**
 * Carga todo el contexto necesario para calcular un rango de fechas.
 */
export async function cargarContexto(
  fechaInicio: string,
  fechaFin: string
): Promise<ContextoCalculo> {
  const [config, usuarios, reglasHorario, marcas, ajustes, faltas] = await Promise.all([
    obtenerConfig(),
    obtenerUsuariosActivos(),
    obtenerHorariosEspeciales(),
    obtenerMarcasRango(fechaInicio, fechaFin),
    obtenerAjustesRango(fechaInicio, fechaFin),
    obtenerFaltasRango(fechaInicio, fechaFin),
  ]);

  const marcasMap = new Map<string, Marca[]>();
  for (const m of marcas) {
    const f = fechaLocal(m.ts);
    const k = clave(m.usuarioId, f);
    const lista = marcasMap.get(k);
    if (lista) {
      lista.push(m);
    } else {
      marcasMap.set(k, [m]);
    }
  }

  const ajustesMap = new Map<string, AjusteManual>();
  for (const a of ajustes) {
    ajustesMap.set(clave(a.usuarioId, a.fecha), a);
  }

  return {
    config,
    usuarios,
    reglasHorario,
    marcas: marcasMap,
    ajustes: ajustesMap,
    faltas,
  };
}

/**
 * Calcula el día de un usuario en una fecha concreta.
 */
export function calcularDiaDeUsuario(
  ctx: ContextoCalculo,
  usuario: Usuario,
  fecha: string
): ResultadoDia {
  const fechaDate = new Date(
    Date.UTC(
      Number(fecha.slice(0, 4)),
      Number(fecha.slice(5, 7)) - 1,
      Number(fecha.slice(8, 10)),
      12, 0, 0, 0
    )
  );

  const marcas = ctx.marcas.get(clave(usuario.id, fecha)) ?? [];
  const ajuste = ctx.ajustes.get(clave(usuario.id, fecha)) ?? null;
  const falta = ctx.faltas.get(clave(usuario.id, fecha));

  const horarioEspecial = seleccionarHorarioEspecial(
    ctx.reglasHorario,
    usuario.id,
    fechaDate
  );

  const horario = resolverHorarioReferencia({
    area: usuario.area,
    fecha: fechaDate,
    horarioEspecial,
    horariosPorArea: ctx.config.horariosPorArea,
    horarioSabado: ctx.config.horarioSabado,
    jornadaUsuario: {
      jornadaInicio: usuario.jornadaInicio,
      jornadaFin: usuario.jornadaFin,
      sabadoTrabaja: usuario.sabadoTrabaja,
      sabadoInicio: usuario.sabadoInicio,
      sabadoFin: usuario.sabadoFin,
    },
  });

  return calcularDia({
    fecha: fechaDate,
    marcas,
    ajusteManual: ajuste
      ? {
          entrada: ajuste.entrada,
          salida: ajuste.salida,
          observaciones: ajuste.observaciones ?? undefined,
        }
      : null,
    minutosComida: usuario.minutosComida,
    minutosComidaSabado: usuario.sabadoMinutosComida,
    horarioReferencia: horario,
    minEntreMarcas: ctx.config.minEntreMarcas,
    minutosMinimosComida: ctx.config.minutosMinimosComida,
    faltaJustificada: falta?.justificada ?? false,
  });
}

/**
 * Días que componen la semana de un usuario: lunes a sábado.
 *
 * El domingo se añade SOLO si hubo marcas o ajuste manual. Una checada en
 * domingo es una incidencia (no suma horas ni horas extra, pero se conserva),
 * y el reporte debe poder mostrarla. En cambio, un domingo sin registros no
 * es nada: no es falta ni incidencia, y meterlo ensuciaría el reporte de
 * todas las semanas pasadas.
 */
export function diasDeSemanaLaboral(
  ctx: ContextoCalculo,
  usuario: Usuario,
  lunes: Date
): ResultadoDia[] {
  const dias: ResultadoDia[] = [];

  for (let d = 0; d < 6; d++) {
    const dia = new Date(lunes.getTime());
    dia.setUTCDate(lunes.getUTCDate() + d);
    dias.push(calcularDiaDeUsuario(ctx, usuario, fechaLocal(dia)));
  }

  const domingo = new Date(lunes.getTime());
  domingo.setUTCDate(lunes.getUTCDate() + 6);
  const fechaDomingo = fechaLocal(domingo);

  const hayMarcasDomingo = (ctx.marcas.get(clave(usuario.id, fechaDomingo)) ?? []).length > 0;
  const hayAjusteDomingo = ctx.ajustes.has(clave(usuario.id, fechaDomingo));

  if (hayMarcasDomingo || hayAjusteDomingo) {
    dias.push(calcularDiaDeUsuario(ctx, usuario, fechaDomingo));
  }

  return dias;
}
