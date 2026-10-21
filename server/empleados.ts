/**
 * Datos de la página /admin/empleados:
 * catálogo de trabajadores + su detalle semana por semana.
 */
import { calcularSemana, type ResultadoDia } from "@/lib/motor-horas";
import { fechaLocal, ahoraMx } from "@/lib/tz";
import { cargarContexto, calcularDiaDeUsuario } from "./calculo";
import { obtenerLunes } from "./queries";
import { obtenerUsuarios } from "./queries-admin";
import { diasLaboralesObjetivo } from "./reporte";

const NOMBRES_DIA = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

const DIAS_LABORALES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export interface EmpleadoSemana {
  id: string;
  nombre: string;
  correo: string;
  area: string;
  legajo: number | null;
  etiquetaNfc: string | null;
  totalHorasMin: number;
  extraMin: number;
  asistencias: number;
  faltas: number;
  diasObjetivo: number;
  estado: string;
  nota: string | null;
  dias: {
    dia: string;
    fecha: string;
    entrada: string | null;
    salida: string | null;
    trabajadas: string;
    extra: string;
    estado: string;
  }[];
}

export interface EmpleadosSemana {
  lunes: string;
  sabado: string;
  filas: EmpleadoSemana[];
}

/**
 * Calcula el detalle de la semana (lunes a sábado) para todo el catálogo.
 */
export async function obtenerDetalleSemanaEmpleados(
  fechaLunes?: Date
): Promise<EmpleadosSemana> {
  const lunes = fechaLunes ?? obtenerLunes(ahoraMx());

  const lunesAnterior = new Date(lunes.getTime());
  lunesAnterior.setUTCDate(lunesAnterior.getUTCDate() - 7);

  const sabadoActual = new Date(lunes.getTime());
  sabadoActual.setUTCDate(sabadoActual.getUTCDate() + 5);

  const ctx = await cargarContexto(
    fechaLocal(lunesAnterior),
    fechaLocal(sabadoActual)
  );

  const usuarios = await obtenerUsuarios(true);
  const porId = new Map(usuarios.map((u) => [u.id, u]));
  const diasObjetivo = diasLaboralesObjetivo(lunes);

  const filas: EmpleadoSemana[] = [];

  for (const usuario of ctx.usuarios) {
    const dias: ResultadoDia[] = [];
    for (let d = 0; d < 6; d++) {
      const dia = new Date(lunes.getTime());
      dia.setUTCDate(lunes.getUTCDate() + d);
      dias.push(calcularDiaDeUsuario(ctx, usuario, fechaLocal(dia)));
    }

    const sabadoPrev = new Date(lunesAnterior.getTime());
    sabadoPrev.setUTCDate(lunesAnterior.getUTCDate() + 5);
    const diaSabadoPrev = calcularDiaDeUsuario(
      ctx,
      usuario,
      fechaLocal(sabadoPrev)
    );
    const extraTraida = ctx.config.trasladaExtraSabado
      ? diaSabadoPrev.extra
      : 0;

    const resumen = calcularSemana(
      dias,
      lunes,
      ctx.config.trasladaExtraSabado,
      extraTraida,
      fechaLocal(ahoraMx())
    );

    const tieneIncidenciaDomingo = dias.some(
      (d) => d.estado === "Incidencia: domingo"
    );

    let estado = "CUMPLIDO";
    let nota: string | null = null;

    if (resumen.faltas > 0) {
      estado = "PENDIENTE";
      nota = `${resumen.faltas} falta${resumen.faltas > 1 ? "s" : ""}`;
    } else if (resumen.asistencias < diasObjetivo) {
      estado = "PENDIENTE";
      nota = "Sáb. pendiente";
    } else if (tieneIncidenciaDomingo) {
      estado = "INCIDENCIA";
      nota = "Inc. sábado";
    } else if (diasObjetivo < 6) {
      nota = "Sáb. pendiente";
    }

    const meta = porId.get(usuario.id);

    filas.push({
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      area: usuario.area,
      legajo: meta?.legajo ?? null,
      etiquetaNfc: meta?.etiquetaNfc ?? null,
      totalHorasMin: resumen.trabajadas,
      extraMin: resumen.extraTotal,
      asistencias: resumen.asistencias,
      faltas: resumen.faltas,
      diasObjetivo,
      estado,
      nota,
      dias: dias.map((d) => ({
        dia: DIAS_LABORALES[d.diaSemana - 1] ?? NOMBRES_DIA[d.diaSemana],
        fecha: d.fecha,
        entrada: d.entrada,
        salida: d.salida,
        trabajadas: `${String(Math.floor(d.netas / 60)).padStart(2, "0")}:${String(
          d.netas % 60
        ).padStart(2, "0")}`,
        extra: `${String(Math.floor(d.extra / 60)).padStart(2, "0")}:${String(
          d.extra % 60
        ).padStart(2, "0")}`,
        estado: d.estado,
      })),
    });
  }

  filas.sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })
  );

  return {
    lunes: fechaLocal(lunes),
    sabado: fechaLocal(sabadoActual),
    filas,
  };
}
