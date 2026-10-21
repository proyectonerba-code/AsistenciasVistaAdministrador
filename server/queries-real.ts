/**
 * Consultas de lectura a Supabase (service role, solo servidor).
 * Todas las entradas se validan con zod.
 */
import { supabaseAdmin } from "@/lib/supabase/server";
import { fechaLocal, inicioDiaMx, finDiaMx } from "@/lib/tz";
import type { HorarioArea } from "@/lib/motor-horas";
import { z } from "zod";

const FechaSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha debe ser YYYY-MM-DD");

const UuidSchema = z.string().uuid("ID inválido");

/* ===================================================================== */
/* Usuarios                                                              */
/* ===================================================================== */

export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  area: "Oficina" | "Técnico" | "Sin asignar";
  minutosComida: number;
  legajo: number | null;
  etiquetaNfc: string | null;
  activo: boolean;
  tokenPrefijo?: string | null;
}

export async function obtenerUsuariosActivos(): Promise<Usuario[]> {
  const { data, error } = await supabaseAdmin
    .from("usuarios")
    .select(
      "id, nombre, correo, area, minutos_comida, legajo, etiqueta_nfc, activo, token_prefijo"
    )
    .eq("activo", true)
    .order("nombre");

  if (error) throw new Error(`Error obteniendo usuarios: ${error.message}`);

  return (data ?? []).map((u) => ({
    id: u.id,
    nombre: u.nombre,
    correo: u.correo,
    area: u.area as Usuario["area"],
    minutosComida: u.minutos_comida ?? 60,
    legajo: u.legajo ?? null,
    etiquetaNfc: u.etiqueta_nfc ?? null,
    activo: u.activo,
    tokenPrefijo: u.token_prefijo ?? null,
  }));
}

export async function obtenerUsuarioPorId(id: string): Promise<Usuario | null> {
  const validado = UuidSchema.safeParse(id);
  if (!validado.success) return null;

  const { data, error } = await supabaseAdmin
    .from("usuarios")
    .select(
      "id, nombre, correo, area, minutos_comida, legajo, etiqueta_nfc, activo, token_prefijo"
    )
    .eq("id", id)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    nombre: data.nombre,
    correo: data.correo,
    area: data.area as Usuario["area"],
    minutosComida: data.minutos_comida ?? 60,
    legajo: data.legajo ?? null,
    etiquetaNfc: data.etiqueta_nfc ?? null,
    activo: data.activo,
    tokenPrefijo: data.token_prefijo ?? null,
  };
}

/* ===================================================================== */
/* Config                                                                */
/* ===================================================================== */

export interface ConfigSistema {
  horariosPorArea: Record<string, HorarioArea>;
  horarioSabado: { inicio: string; fin: string };
  minutosComidaDefault: number;
  minutosMinimosComida: number;
  minEntreMarcas: number;
  horaMinRegistro: string;
  horaMaxRegistro: string;
  trasladaExtraSabado: boolean;
}

export async function obtenerConfig(): Promise<ConfigSistema> {
  const { data } = await supabaseAdmin.from("config").select("clave, valor");

  const filas = data ?? [];
  const obtener = (clave: string, def: unknown): unknown => {
    const fila = filas.find((f) => f.clave === clave);
    return fila?.valor ?? def;
  };

  const horariosPorAreaRaw = obtener("horarios_por_area", {
    Oficina: { inicio: "09:00", fin: "19:00" },
    Técnico: { inicio: "09:00", fin: "20:00" },
    "Sin asignar": { inicio: "09:00", fin: "19:00" },
  });
  const horarioSabadoRaw = obtener("horario_sabado", {
    inicio: "09:00",
    fin: "15:00",
  });
  const minutosComidaDefaultRaw = obtener("minutos_comida_default", 60);
  const minutosMinimosComidaRaw = obtener("minutos_minimos_para_comida", 300);
  const minEntreMarcasRaw = obtener("minutos_entre_marcas", 5);
  const horaMinRaw = obtener("hora_min_registro", "06:00");
  const horaMaxRaw = obtener("hora_max_registro", "23:30");
  const trasladaExtraSabadoRaw = obtener("trasladar_extra_sabado", true);

  return {
    horariosPorArea: horariosPorAreaRaw as Record<string, HorarioArea>,
    horarioSabado: horarioSabadoRaw as { inicio: string; fin: string },
    minutosComidaDefault: typeof minutosComidaDefaultRaw === "number"
      ? minutosComidaDefaultRaw
      : 60,
    minutosMinimosComida: typeof minutosMinimosComidaRaw === "number"
      ? minutosMinimosComidaRaw
      : 300,
    minEntreMarcas: typeof minEntreMarcasRaw === "number"
      ? minEntreMarcasRaw
      : 5,
    horaMinRegistro: typeof horaMinRaw === "string" ? horaMinRaw : "06:00",
    horaMaxRegistro: typeof horaMaxRaw === "string" ? horaMaxRaw : "23:30",
    trasladaExtraSabado:
      typeof trasladaExtraSabadoRaw === "boolean"
        ? trasladaExtraSabadoRaw
        : true,
  };
}

/* ===================================================================== */
/* Horarios especiales                                                   */
/* ===================================================================== */

export interface ReglaHorarioEspecial {
  usuarioId: string;
  diaSemana: number;
  entrada: string;
  salida: string;
  vigenteDesde: string;
  vigenteHasta: string | null;
  activo: boolean;
}

export async function obtenerHorariosEspeciales(
  usuarioId?: string
): Promise<ReglaHorarioEspecial[]> {
  let q = supabaseAdmin
    .from("horarios_especiales")
    .select("usuario_id, dia_semana, entrada, salida, vigente_desde, vigente_hasta, activo");
  if (usuarioId) {
    q = q.eq("usuario_id", usuarioId);
  }
  q = q.eq("activo", true);

  const { data, error } = await q;
  if (error) throw new Error(`Error obteniendo horarios especiales: ${error.message}`);

  return (data ?? []).map((r) => ({
    usuarioId: r.usuario_id,
    diaSemana: r.dia_semana,
    entrada: r.entrada,
    salida: r.salida,
    vigenteDesde: r.vigente_desde,
    vigenteHasta: r.vigente_hasta,
    activo: r.activo,
  }));
}

/* ===================================================================== */
/* Marcas                                                                */
/* ===================================================================== */

export interface Marca {
  id: string;
  usuarioId: string;
  ts: Date;
  lat?: number | null;
  lng?: number | null;
  accuracy?: number | null;
  distanciaM?: number | null;
  origen: string;
}

export async function obtenerMarcasPorUsuarioFecha(
  usuarioId: string,
  fecha: string
): Promise<Marca[]> {
  const validado = FechaSchema.safeParse(fecha);
  if (!validado.success) return [];

  const inicio = inicioDiaMx(fecha);
  const fin = finDiaMx(fecha);

  const { data, error } = await supabaseAdmin
    .from("marcas")
    .select("id, usuario_id, ts, lat, lng, accuracy, distancia_m, origen")
    .eq("usuario_id", usuarioId)
    .gte("ts", inicio.toISOString())
    .lte("ts", fin.toISOString())
    .order("ts", { ascending: true });

  if (error) return [];

  return (data ?? []).map((m) => ({
    id: m.id,
    usuarioId: m.usuario_id,
    ts: new Date(m.ts),
    lat: m.lat ?? null,
    lng: m.lng ?? null,
    accuracy: m.accuracy ?? null,
    distanciaM: m.distancia_m ?? null,
    origen: m.origen,
  }));
}

/* ===================================================================== */
/* Ajustes manuales                                                      */
/* ===================================================================== */

export interface AjusteManual {
  id: string;
  usuarioId: string;
  fecha: string;
  entrada: string | null;
  salida: string | null;
  observaciones?: string | null;
  creadoPor: string;
  creadoEn: Date;
}

export async function obtenerAjusteManual(
  usuarioId: string,
  fecha: string
): Promise<AjusteManual | null> {
  const validado = FechaSchema.safeParse(fecha);
  if (!validado.success) return null;

  const { data, error } = await supabaseAdmin
    .from("ajustes_manuales")
    .select("*")
    .eq("usuario_id", usuarioId)
    .eq("fecha", fecha)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    usuarioId: data.usuario_id,
    fecha: data.fecha,
    entrada: data.entrada,
    salida: data.salida,
    observaciones: data.observaciones,
    creadoPor: data.creado_por,
    creadoEn: new Date(data.creado_en),
  };
}

/* ===================================================================== */
/* Consultas de rango (varias fechas de golpe)                            */
/* ===================================================================== */

/**
 * Todas las marcas de un rango de fechas (YYYY-MM-DD inclusivo).
 * Se usa para calcular semanas completas sin N consultas.
 */
export async function obtenerMarcasRango(
  fechaInicio: string,
  fechaFin: string
): Promise<Marca[]> {
  const inicioValida = FechaSchema.safeParse(fechaInicio);
  const finValida = FechaSchema.safeParse(fechaFin);
  if (!inicioValida.success || !finValida.success) return [];

  const inicio = inicioDiaMx(fechaInicio);
  const fin = finDiaMx(fechaFin);

  const { data, error } = await supabaseAdmin
    .from("marcas")
    .select("id, usuario_id, ts, lat, lng, accuracy, distancia_m, origen")
    .gte("ts", inicio.toISOString())
    .lte("ts", fin.toISOString())
    .order("ts", { ascending: true });

  if (error) return [];

  return (data ?? []).map((m) => ({
    id: m.id,
    usuarioId: m.usuario_id,
    ts: new Date(m.ts),
    lat: m.lat ?? null,
    lng: m.lng ?? null,
    accuracy: m.accuracy ?? null,
    distanciaM: m.distancia_m ?? null,
    origen: m.origen,
  }));
}

/**
 * Todos los ajustes manuales de un rango de fechas.
 */
export async function obtenerAjustesRango(
  fechaInicio: string,
  fechaFin: string
): Promise<AjusteManual[]> {
  const inicioValida = FechaSchema.safeParse(fechaInicio);
  const finValida = FechaSchema.safeParse(fechaFin);
  if (!inicioValida.success || !finValida.success) return [];

  const { data, error } = await supabaseAdmin
    .from("ajustes_manuales")
    .select("*")
    .gte("fecha", fechaInicio)
    .lte("fecha", fechaFin);

  if (error) return [];

  return (data ?? []).map((a) => ({
    id: a.id,
    usuarioId: a.usuario_id,
    fecha: a.fecha,
    entrada: a.entrada,
    salida: a.salida,
    observaciones: a.observaciones,
    creadoPor: a.creado_por,
    creadoEn: new Date(a.creado_en),
  }));
}

/**
 * Faltas de un rango de fechas (para marcar "Falta" / "Falta justificada").
 */
export async function obtenerFaltasRango(
  fechaInicio: string,
  fechaFin: string
): Promise<Map<string, { justificada: boolean; motivo: string | null }>> {
  const inicioValida = FechaSchema.safeParse(fechaInicio);
  const finValida = FechaSchema.safeParse(fechaFin);
  if (!inicioValida.success || !finValida.success) return new Map();

  const { data } = await supabaseAdmin
    .from("faltas")
    .select("usuario_id, fecha, justificada, motivo")
    .gte("fecha", fechaInicio)
    .lte("fecha", fechaFin);

  const mapa = new Map<string, { justificada: boolean; motivo: string | null }>();
  for (const f of data ?? []) {
    mapa.set(`${f.usuario_id}|${f.fecha}`, {
      justificada: f.justificada,
      motivo: f.motivo,
    });
  }
  return mapa;
}

/* ===================================================================== */
/* Utilidades de fecha                                                   */
/* ===================================================================== */

/**
 * Devuelve el lunes de la semana de una fecha (zona México).
 * El resultado representa el lunes al mediodía en zona México.
 */
export function obtenerLunes(fecha: Date): Date {
  const fechaStr = fechaLocal(fecha);
  const partes = fechaStr.split("-").map(Number);
  const d = new Date(Date.UTC(partes[0], partes[1] - 1, partes[2], 12, 0, 0, 0));
  const dia = d.getUTCDay(); // 0=domingo ... 6=sábado
  const ajuste = dia === 0 ? -6 : 1 - dia;
  d.setUTCDate(d.getUTCDate() + ajuste);
  return d;
}

/**
 * Genera las fechas lunes a sábado de una semana (zona México).
 */
export function fechasSemana(lunes: Date): string[] {
  const fechas: string[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(lunes.getTime());
    d.setUTCDate(lunes.getUTCDate() + i);
    fechas.push(fechaLocalMX(d));
  }
  return fechas;
}

function fechaLocalMX(d: Date): string {
  const partes = [
    d.getUTCFullYear(),
    d.getUTCMonth() + 1,
    d.getUTCDate(),
  ];
  return `${partes[0]}-${String(partes[1]).padStart(2, "0")}-${String(partes[2]).padStart(2, "0")}`;
}
