/**
 * Lógica para /admin/personas/[id]: bloques por semana (lunes a sábado),
 * con la semana más reciente arriba.
 */
import { calcularSemana } from "@/lib/motor-horas";
import { minutosAHHMM, fechaLocal, ahoraMx } from "@/lib/tz";
import {
  cargarContexto,
  calcularDiaDeUsuario,
  diasDeSemanaLaboral,
} from "./calculo";
import { obtenerLunes, obtenerUsuarioPorId, type Usuario } from "./queries";
import { obtenerUsuarios } from "./queries-admin";

const NOMBRES_DIA = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

const DIAS_LABORALES = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export interface SemanaPersona {
  lunes: string;
  dias: {
    fecha: string;
    dia: string;
    entrada: string | null;
    salida: string | null;
    bruto: string;
    comida: string;
    trabajadas: string;
    extra: string;
    estado: string;
    notas: string;
  }[];
  totales: {
    trabajadas: string;
    comida: string;
    extra: string;
    extraTraida: string;
    extraASiguiente: string;
    asistencias: number;
    faltas: number;
    incidencias: string[];
  };
}

export interface FichaPersona {
  usuario: Usuario;
  legajo: number | null;
  etiquetaNfc: string | null;
  jornada: string;
  sabado: string;
  semanas: SemanaPersona[];
}

/**
 * Calcula las últimas `cantidadSemanas` semanas de una persona.
 */
export async function obtenerSemanasDePersona(
  usuarioId: string,
  cantidadSemanas = 6
): Promise<FichaPersona | null> {
  const usuario = await obtenerUsuarioPorId(usuarioId);
  if (!usuario) return null;

  const meta = (await obtenerUsuarios(true)).find((u) => u.id === usuarioId);

  const hoy = ahoraMx();
  const lunesActual = obtenerLunes(hoy);

  // Fechas de todas las semanas (incluye la anterior para traer el extra
  // del sábado).
  const luneses: Date[] = [];
  for (let i = -1; i < cantidadSemanas; i++) {
    const d = new Date(lunesActual.getTime());
    d.setUTCDate(lunesActual.getUTCDate() - i * 7);
    luneses.unshift(d);
  }
  // luneses[0] = semana más antigua ... luneses[last] = semana actual

  const fechaInicio = fechaLocal(luneses[0]);
  const ultimoLunes = luneses[luneses.length - 1];
  // La carga llega hasta el domingo de la última semana: una checada en
  // domingo es una incidencia y debe verse en la ficha.
  const finLunes = new Date(ultimoLunes.getTime());
  finLunes.setUTCDate(finLunes.getUTCDate() + 6); // domingo
  const fechaFin = fechaLocal(finLunes);

  const ctx = await cargarContexto(fechaInicio, fechaFin);

  const semanas: SemanaPersona[] = [];

  for (let i = 0; i < luneses.length; i++) {
    const lunes = luneses[i];

    // Lunes a sábado, más el domingo si hubo registro (incidencia).
    const dias = diasDeSemanaLaboral(ctx, usuario, lunes);

    // Extra traída del sábado de la semana anterior.
    let extraTraida = 0;
    if (i > 0) {
      const sabadoPrev = new Date(luneses[i - 1].getTime());
      sabadoPrev.setUTCDate(luneses[i - 1].getUTCDate() + 5);
      const fechaSabadoPrev = fechaLocal(sabadoPrev);
      const diaPrev = calcularDiaDeUsuario(ctx, usuario, fechaSabadoPrev);
      if (ctx.config.trasladaExtraSabado) {
        extraTraida = diaPrev.extra;
      }
    }

    const resumen = calcularSemana(
      dias,
      lunes,
      ctx.config.trasladaExtraSabado,
      extraTraida,
      fechaLocal(ahoraMx())
    );

    semanas.push({
      lunes: fechaLocal(lunes),
      dias: dias.map((d) => ({
        fecha: d.fecha,
        dia: DIAS_LABORALES[d.diaSemana - 1] ?? NOMBRES_DIA[d.diaSemana],
        entrada: d.entrada,
        salida: d.salida,
        bruto: minutosAHHMM(d.brutas),
        comida: minutosAHHMM(d.comida),
        trabajadas: minutosAHHMM(d.netas),
        extra: minutosAHHMM(d.extra),
        estado: d.estado,
        notas: d.observaciones,
      })),
      totales: {
        trabajadas: minutosAHHMM(resumen.trabajadas),
        comida: minutosAHHMM(dias.reduce((acc, d) => acc + d.comida, 0)),
        extra: minutosAHHMM(resumen.extraTotal),
        extraTraida: minutosAHHMM(resumen.extraTraida),
        extraASiguiente: minutosAHHMM(resumen.extraASiguienteSemana),
        asistencias: resumen.asistencias,
        faltas: resumen.faltas,
        incidencias: resumen.incidencias,
      },
    });
  }

  // Semana más reciente arriba.
  semanas.reverse();

  const area = ctx.config.horariosPorArea[usuario.area];
  const sabado = ctx.config.horarioSabado;

  return {
    usuario,
    legajo: meta?.legajo ?? null,
    etiquetaNfc: meta?.etiquetaNfc ?? null,
    jornada: area
      ? `${area.inicio} a ${area.fin}`
      : "Sin horario asignado",
    sabado: `${sabado.inicio} a ${sabado.fin}`,
    semanas,
  };
}
