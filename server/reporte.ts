/**
 * Lógica para el Reporte General de la semana.
 */
import { calcularSemana, type ResultadoDia } from "@/lib/motor-horas";
import {
  fechaLocal,
  ahoraMx,
  diaSemanaNumericoMx,
  sumarDias,
} from "@/lib/tz";
import { cargarContexto, calcularDiaDeUsuario } from "./calculo";
import { obtenerLunes } from "./queries";
import type { EstadoCumplimiento } from "@/components/ui/reporte-tabla";

export interface FilaReporte {
  id: string;
  nombre: string;
  correo: string;
  area: string;
  trabajadasMin: number;
  extraMin: number;
  asistencias: number;
  faltas: number;
  diasObjetivo: number;
  estado: EstadoCumplimiento;
  nota: string | null;
}

export interface ReporteSemana {
  lunes: string;
  sabado: string;
  rango: string;
  filas: FilaReporte[];
  total: {
    trabajadasMin: number;
    extraMin: number;
    asistencias: number;
    faltas: number;
  };
}

/**
 * Días laborables objetivo de la semana: lunes a sábado, pero sin contar los
 * días que todavía no han ocurrido. Durante la semana en curso el sábado
 * queda como "pendiente".
 */
export function diasLaboralesObjetivo(lunes: Date): number {
  const hoy = fechaLocal(ahoraMx());
  const inicioSemana = fechaLocal(lunes);
  const finSemana = sumarDias(inicioSemana, 5);

  if (hoy < inicioSemana || hoy > finSemana) return 6;

  const diaHoy = diaSemanaNumericoMx(hoy); // 1 = lunes ... 6 = sábado
  return Math.min(6, Math.max(1, diaHoy));
}

/** Texto del rango: "Semana 43: 20 al 24 de Octubre de 2025". */
export function textoRangoSemana(lunes: Date): string {
  const zona = "America/Mexico_City";
  const lunesTexto = new Intl.DateTimeFormat("es-MX", {
    timeZone: zona,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(lunes);
  const sabado = new Date(lunes.getTime());
  sabado.setUTCDate(sabado.getUTCDate() + 5);
  const sabadoTexto = new Intl.DateTimeFormat("es-MX", {
    timeZone: zona,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(sabado);

  const numeroSemana = numeroSemanaISO(lunes);
  return `Semana ${numeroSemana}: ${lunesTexto} al ${sabadoTexto}`;
}

/** Número de semana ISO-8601 de la semana del lunes indicado. */
export function numeroSemanaISO(lunes: Date): number {
  const d = new Date(
    Date.UTC(
      lunes.getUTCFullYear(),
      lunes.getUTCMonth(),
      lunes.getUTCDate()
    )
  );
  // Jueves de la semana (la norma ISO usa el jueves para el año).
  const dia = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dia);
  const anio = d.getUTCFullYear();
  const inicioAnio = new Date(Date.UTC(anio, 0, 1));
  return (
    Math.ceil(
      ((d.getTime() - inicioAnio.getTime()) / 86400000 + 1) / 7
    ) || 1
  );
}

/**
 * Calcula el reporte de una semana (lunes a sábado).
 * Incluye la extra traída del sábado de la semana anterior.
 */
export async function obtenerReporteSemana(
  fechaLunes?: Date
): Promise<ReporteSemana> {
  const lunes = fechaLunes ?? obtenerLunes(ahoraMx());

  // Rango: semana anterior (para traer extra del sábado) + semana actual.
  const lunesAnterior = new Date(lunes.getTime());
  lunesAnterior.setUTCDate(lunesAnterior.getUTCDate() - 7);

  const fechaInicio = fechaLocal(lunesAnterior);
  const sabadoActual = new Date(lunes.getTime());
  sabadoActual.setUTCDate(sabadoActual.getUTCDate() + 5);
  const fechaFin = fechaLocal(sabadoActual);

  const ctx = await cargarContexto(fechaInicio, fechaFin);
  const diasObjetivo = diasLaboralesObjetivo(lunes);

  const filas: FilaReporte[] = [];
  let totalTrabajadas = 0;
  let totalExtra = 0;
  let totalAsistencias = 0;
  let totalFaltas = 0;

  for (const usuario of ctx.usuarios) {
    const dias: ResultadoDia[] = [];
    for (let d = 0; d < 6; d++) {
      const dia = new Date(lunes.getTime());
      dia.setUTCDate(lunes.getUTCDate() + d);
      dias.push(calcularDiaDeUsuario(ctx, usuario, fechaLocal(dia)));
    }

    // Extra traída del sábado anterior.
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

    let estado: EstadoCumplimiento = "CUMPLIDO";
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

    filas.push({
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      area: usuario.area,
      trabajadasMin: resumen.trabajadas,
      extraMin: resumen.extraTotal,
      asistencias: resumen.asistencias,
      faltas: resumen.faltas,
      diasObjetivo,
      estado,
      nota,
    });

    totalTrabajadas += resumen.trabajadas;
    totalExtra += resumen.extraTotal;
    totalAsistencias += resumen.asistencias;
    totalFaltas += resumen.faltas;
  }

  filas.sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }));

  return {
    lunes: fechaLocal(lunes),
    sabado: fechaLocal(sabadoActual),
    rango: textoRangoSemana(lunes),
    filas,
    total: {
      trabajadasMin: totalTrabajadas,
      extraMin: totalExtra,
      asistencias: totalAsistencias,
      faltas: totalFaltas,
    },
  };
}
