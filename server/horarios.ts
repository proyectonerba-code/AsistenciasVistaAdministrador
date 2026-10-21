/**
 * Datos de /admin/horarios:
 *   - jornada efectiva de cada colaborador (lunes a viernes y sábado)
 *   - reglas de horario especial por persona y día
 */
import { fechaLocal, ahoraMx, diaSemanaNumericoMx } from "@/lib/tz";
import { obtenerUsuarios } from "./queries-admin";
import { obtenerConfig } from "./queries";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { HorarioArea } from "@/lib/motor-horas";

export interface JornadaColaborador {
  usuarioId: string;
  nombre: string;
  area: string;
  legajo: number | null;
  minutosComida: number;
  /** "09:00 - 19:00" o "Descanso" o "Sin horario". */
  lunesAViernes: string;
  /** Hora de inicio y fin por separado (para editar). */
  lvInicio: string;
  lvFin: string;
  /** Reglas especiales que aplican a esta persona (lunes a viernes). */
  tieneEspeciales: boolean;
  sabado: string;
  sabadoInicio: string;
  sabadoFin: string;
  sabadoDescanso: boolean;
}

export interface HorariosColaboradores {
  filas: JornadaColaborador[];
  areaPorDefecto: Record<string, HorarioArea>;
  horarioSabado: { inicio: string; fin: string };
}

/**
 * Calcula la jornada efectiva de cada colaborador para la fecha de referencia.
 */
export async function obtenerJornadasColaboradores(
  fechaRef?: string
): Promise<HorariosColaboradores> {
  const config = await obtenerConfig();
  const usuarios = await obtenerUsuarios(true);
  const referencia = fechaRef ?? fechaLocal(ahoraMx());

  const { data: especiales } = await supabaseAdmin
    .from("horarios_especiales")
    .select(
      "usuario_id, dia_semana, entrada, salida, vigente_desde, vigente_hasta, activo"
    );

  const hoy = referencia;

  const filas: JornadaColaborador[] = usuarios.map((u) => {
    const area = (config.horariosPorArea[u.area] ??
      config.horariosPorArea["Sin asignar"] ??
      { inicio: "09:00", fin: "19:00" }) as HorarioArea;

    const reglasDeEsta = (especiales ?? []).filter(
      (r) =>
        r.usuario_id === u.id &&
        r.activo !== false &&
        String(r.vigente_desde) <= hoy &&
        (!r.vigente_hasta || String(r.vigente_hasta) >= hoy)
    );

    // Reglas de lunes a viernes (día 1..5).
    const lv = reglasDeEsta.filter((r) => r.dia_semana >= 1 && r.dia_semana <= 5);
    const sab = reglasDeEsta.find((r) => r.dia_semana === 6);

    let lvInicio = area.inicio;
    let lvFin = area.fin;
    if (lv.length > 0) {
      // Si hay varias, gana la más reciente por "vigente desde".
      const masReciente = [...lv].sort((a, b) =>
        String(b.vigente_desde).localeCompare(String(a.vigente_desde))
      )[0];
      lvInicio = String(masReciente.entrada).slice(0, 5);
      lvFin = String(masReciente.salida).slice(0, 5);
    }

    let sabadoInicio = config.horarioSabado.inicio;
    let sabadoFin = config.horarioSabado.fin;
    let sabadoDescanso = false;

    if (sab) {
      sabadoInicio = String(sab.entrada).slice(0, 5);
      sabadoFin = String(sab.salida).slice(0, 5);
    } else if (area.sabado === null) {
      sabadoDescanso = true;
    } else if (area.sabado && typeof area.sabado === "object") {
      sabadoInicio = area.sabado.inicio;
      sabadoFin = area.sabado.fin;
    }

    return {
      usuarioId: u.id,
      nombre: u.nombre,
      area: u.area,
      legajo: u.legajo,
      minutosComida: u.minutosComida,
      lunesAViernes: `${lvInicio} - ${lvFin}`,
      lvInicio,
      lvFin,
      tieneEspeciales: lv.length > 0 || !!sab,
      sabado: sabadoDescanso ? "Descanso" : `${sabadoInicio} - ${sabadoFin}`,
      sabadoInicio,
      sabadoFin,
      sabadoDescanso,
    };
  });

  filas.sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })
  );

  return {
    filas,
    areaPorDefecto: config.horariosPorArea,
    horarioSabado: config.horarioSabado,
  };
}

/** Etiqueta del día a partir de su número (0 = domingo). */
export function nombreDia(dia: number): string {
  return [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ][dia] ?? "—";
}

/** Día de la semana de una fecha (0 = domingo). */
export function diaSemana(fecha: string): number {
  return diaSemanaNumericoMx(fecha);
}
