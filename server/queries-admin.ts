/**
 * Consultas administrativas complementarias.
 *
 * Funciona igual contra Supabase real (service role) y contra el cliente
 * simulado del modo demo: evita los JOIN de PostgREST y resuelve las
 * relaciones en memoria para que ambos modos devuelvan exactamente lo mismo.
 */
import { supabaseAdmin } from "@/lib/supabase/server";
import { fechaLocal, inicioDiaMx, finDiaMx } from "@/lib/tz";
import { z } from "zod";

const FechaSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha YYYY-MM-DD");

/* ===================================================================== */
/* Usuarios                                                             */
/* ===================================================================== */

export interface UsuarioAdmin {
  id: string;
  nombre: string;
  correo: string;
  area: "Oficina" | "Técnico" | "Sin asignar";
  minutosComida: number;
  legajo: number | null;
  etiquetaNfc: string | null;
  tokenPrefijo: string | null;
  activo: boolean;
}

/**
 * Lista usuarios. Por defecto solo los activos.
 */
export async function obtenerUsuarios(
  incluirInactivos = false
): Promise<UsuarioAdmin[]> {
  let q = supabaseAdmin
    .from("usuarios")
    .select(
      "id, nombre, correo, area, minutos_comida, legajo, etiqueta_nfc, token_prefijo, activo"
    )
    .order("nombre");

  if (!incluirInactivos) q = q.eq("activo", true);

  const { data, error } = await q;
  if (error) throw new Error(`Error obteniendo usuarios: ${error.message}`);

  return (data ?? []).map((u) => ({
    id: u.id,
    nombre: u.nombre,
    correo: u.correo,
    area: (u.area ?? "Sin asignar") as UsuarioAdmin["area"],
    minutosComida: u.minutos_comida ?? 60,
    legajo: u.legajo ?? null,
    etiquetaNfc: u.etiqueta_nfc ?? null,
    tokenPrefijo: u.token_prefijo ?? null,
    activo: u.activo !== false,
  }));
}

/* ===================================================================== */
/* Rechazados — auditoría de checadas no aceptadas                       */
/* ===================================================================== */

export interface RechazadoAdmin {
  id: string;
  ts: Date;
  usuarioId: string | null;
  nombre: string | null;
  correo: string | null;
  tokenPrefijo: string | null;
  motivo: string;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  distanciaM: number | null;
  detalle: string | null;
}

/**
 * Últimos rechazos, del más reciente al más antiguo.
 */
export async function obtenerRechazados(
  limite = 100
): Promise<RechazadoAdmin[]> {
  const { data, error } = await supabaseAdmin
    .from("rechazados")
    .select(
      "id, ts, usuario_id, token_prefijo, motivo, lat, lng, accuracy, distancia_m, detalle"
    )
    .order("ts", { ascending: false })
    .limit(limite);

  if (error) throw new Error(`Error obteniendo rechazados: ${error.message}`);

  const usuarios = await obtenerUsuarios(true);
  const porId = new Map(usuarios.map((u) => [u.id, u]));

  return (data ?? []).map((r) => {
    const u = r.usuario_id ? porId.get(r.usuario_id) : undefined;
    return {
      id: r.id,
      ts: new Date(r.ts),
      usuarioId: r.usuario_id ?? null,
      nombre: u?.nombre ?? null,
      correo: u?.correo ?? null,
      tokenPrefijo: r.token_prefijo ?? null,
      motivo: r.motivo,
      lat: r.lat ?? null,
      lng: r.lng ?? null,
      accuracy: r.accuracy ?? null,
      distanciaM: r.distancia_m ?? null,
      detalle: r.detalle ?? null,
    };
  });
}

/* ===================================================================== */
/* Pendientes — entradas sin salida                                     */
/* ===================================================================== */

export interface PendienteAdmin {
  usuarioId: string;
  nombre: string;
  correo: string;
  area: string;
  fecha: string;
  entrada: string;
  marcas: number;
  origen: string;
}

/**
 * Personas con una entrada registrada y sin salida en la fecha indicada.
 * Es el equivalente a la hoja "Pendientes" del control de asistencia original.
 */
export async function obtenerPendientes(
  fecha: string
): Promise<PendienteAdmin[]> {
  const validado = FechaSchema.safeParse(fecha);
  if (!validado.success) return [];

  const inicio = inicioDiaMx(validado.data);
  const fin = finDiaMx(validado.data);

  const { data } = await supabaseAdmin
    .from("marcas")
    .select("id, usuario_id, ts, origen")
    .gte("ts", inicio.toISOString())
    .lte("ts", fin.toISOString())
    .order("ts", { ascending: true });

  const marcas = data ?? [];
  if (marcas.length === 0) return [];

  // Agrupar marcas por usuario: 1 marca => entrada abierta, 2+ => cerrada.
  const porUsuario = new Map<string, typeof marcas>();
  for (const m of marcas) {
    const lista = porUsuario.get(m.usuario_id) ?? [];
    lista.push(m);
    porUsuario.set(m.usuario_id, lista);
  }

  const usuarios = await obtenerUsuarios(true);
  const porId = new Map(usuarios.map((u) => [u.id, u]));

  const pendientes: PendienteAdmin[] = [];

  for (const [usuarioId, lista] of porUsuario) {
    if (lista.length % 2 === 0) continue; // entrada y salida cerradas

    const u = porId.get(usuarioId);
    if (!u || !u.activo) continue;

    const primera = lista[0];
    const hora = new Intl.DateTimeFormat("es-MX", {
      timeZone: "America/Mexico_City",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(primera.ts));

    pendientes.push({
      usuarioId,
      nombre: u.nombre,
      correo: u.correo,
      area: u.area,
      fecha: validado.data,
      entrada: hora,
      marcas: lista.length,
      origen: primera.origen ?? "nfc",
    });
  }

  pendientes.sort((a, b) => a.entrada.localeCompare(b.entrada));
  return pendientes;
}

/* ===================================================================== */
/* Sedes (geocercas)                                                    */
/* ===================================================================== */

export interface SedeAdmin {
  id: string;
  nombre: string;
  lat: number;
  lng: number;
  radioM: number;
  activa: boolean;
}

export async function obtenerSedes(): Promise<SedeAdmin[]> {
  const { data, error } = await supabaseAdmin
    .from("sedes")
    .select("id, nombre, lat, lng, radio_m, activa")
    .order("nombre");

  if (error) throw new Error(`Error obteniendo sedes: ${error.message}`);

  return (data ?? []).map((s) => ({
    id: s.id,
    nombre: s.nombre,
    lat: s.lat,
    lng: s.lng,
    radioM: s.radio_m ?? 100,
    activa: s.activa !== false,
  }));
}

/* ===================================================================== */
/* Horarios especiales (con nombre de la persona)                        */
/* ===================================================================== */

export interface HorarioEspecialAdmin {
  id: string;
  usuarioId: string;
  nombre: string;
  diaSemana: number;
  entrada: string;
  salida: string;
  vigenteDesde: string;
  vigenteHasta: string | null;
  activo: boolean;
}

export async function obtenerHorariosEspecialesDetallados(): Promise<
  HorarioEspecialAdmin[]
> {
  const { data, error } = await supabaseAdmin
    .from("horarios_especiales")
    .select(
      "id, usuario_id, dia_semana, entrada, salida, vigente_desde, vigente_hasta, activo"
    )
    .order("usuario_id")
    .order("dia_semana");

  if (error) {
    throw new Error(`Error obteniendo horarios especiales: ${error.message}`);
  }

  const usuarios = await obtenerUsuarios(true);
  const porId = new Map(usuarios.map((u) => [u.id, u]));

  return (data ?? []).map((r) => ({
    id: r.id,
    usuarioId: r.usuario_id,
    nombre: porId.get(r.usuario_id)?.nombre ?? "—",
    diaSemana: r.dia_semana,
    entrada: String(r.entrada).slice(0, 5),
    salida: String(r.salida).slice(0, 5),
    vigenteDesde: r.vigente_desde,
    vigenteHasta: r.vigente_hasta ?? null,
    activo: r.activo !== false,
  }));
}

/* ===================================================================== */
/* Faltas                                                               */
/* ===================================================================== */

export interface FaltaAdmin {
  id: string;
  usuarioId: string;
  nombre: string;
  fecha: string;
  motivo: string | null;
  justificada: boolean;
  creadaPor: string;
}

export async function obtenerFaltas(
  fechaInicio: string,
  fechaFin: string
): Promise<FaltaAdmin[]> {
  const inicio = FechaSchema.safeParse(fechaInicio);
  const fin = FechaSchema.safeParse(fechaFin);
  if (!inicio.success || !fin.success) return [];

  const { data } = await supabaseAdmin
    .from("faltas")
    .select("id, usuario_id, fecha, motivo, justificada, creada_por")
    .gte("fecha", fechaInicio)
    .lte("fecha", fechaFin)
    .order("fecha", { ascending: false });

  const usuarios = await obtenerUsuarios(true);
  const porId = new Map(usuarios.map((u) => [u.id, u]));

  return (data ?? []).map((f) => ({
    id: f.id,
    usuarioId: f.usuario_id,
    nombre: porId.get(f.usuario_id)?.nombre ?? "—",
    fecha: f.fecha,
    motivo: f.motivo ?? null,
    justificada: f.justificada === true,
    creadaPor: f.creada_por,
  }));
}

/* ===================================================================== */
/* Bitácora                                                             */
/* ===================================================================== */

export interface BitacoraAdmin {
  id: string;
  ts: Date;
  actor: string;
  accion: string;
  entidad: string;
}

export async function obtenerBitacora(limite = 50): Promise<BitacoraAdmin[]> {
  const { data } = await supabaseAdmin
    .from("bitacora")
    .select("id, ts, actor, accion, entidad")
    .order("ts", { ascending: false })
    .limit(limite);

  return (data ?? []).map((b) => ({
    id: b.id,
    ts: new Date(b.ts),
    actor: b.actor,
    accion: b.accion,
    entidad: b.entidad,
  }));
}

/* ===================================================================== */
/* Marcas crudas recientes (para el detalle de una persona)              */
/* ===================================================================== */

export interface MarcaAdmin {
  id: string;
  usuarioId: string;
  ts: Date;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  distanciaM: number | null;
  origen: string;
}

export async function obtenerMarcasDeRango(
  fechaInicio: string,
  fechaFin: string
): Promise<MarcaAdmin[]> {
  const inicio = FechaSchema.safeParse(fechaInicio);
  const fin = FechaSchema.safeParse(fechaFin);
  if (!inicio.success || !fin.success) return [];

  const desde = inicioDiaMx(fechaInicio);
  const hasta = finDiaMx(fechaFin);

  const { data } = await supabaseAdmin
    .from("marcas")
    .select(
      "id, usuario_id, ts, lat, lng, accuracy, distancia_m, origen"
    )
    .gte("ts", desde.toISOString())
    .lte("ts", hasta.toISOString())
    .order("ts", { ascending: true });

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

/** Fecha local de hoy en zona oficina. */
export function hoyLocal(): string {
  return fechaLocal(new Date());
}
