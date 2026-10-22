"use server";

/**
 * Server actions del panel admin.
 * Verifican sesión y rol en cada acción (no solo en middleware).
 *
 * Todas las exportaciones de este archivo son Server Actions; las funciones
 * auxiliares internas NO se exportan.
 */
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { login as loginAuth, logout as logoutAuth } from "./auth";
import { generarEtiquetaNfc, generarToken, sha256Hex } from "@/lib/crypto";
import { z } from "zod";

const AjusteSchema = z.object({
  usuarioId: z.string().uuid(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  entrada: z.string().nullish(),
  salida: z.string().nullish(),
  observaciones: z.string().optional(),
});

const UsuarioSchema = z.object({
  id: z.string().uuid().optional(),
  nombre: z.string().trim().min(2, "Nombre demasiado corto").max(120),
  correo: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, "Correo inválido"),
  area: z.enum(["Oficina", "Técnico", "Sin asignar"]),
  minutosComida: z.coerce.number().int().min(0).max(240),
  legajo: z.coerce.number().int().min(1).max(999999).nullable(),
  etiquetaNfc: z.string().trim().max(40).nullable(),
  activo: z.boolean(),
});

const HorarioEspecialSchema = z.object({
  id: z.string().uuid().optional(),
  usuarioId: z.string().uuid(),
  diaSemana: z.coerce.number().int().min(0).max(6),
  entrada: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Entrada inválida (HH:mm)"),
  salida: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Salida inválida (HH:mm)"),
  vigenteDesde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  vigenteHasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  activo: z.boolean(),
});

const SedeSchema = z.object({
  id: z.string().uuid().optional(),
  nombre: z.string().trim().min(2, "Nombre demasiado corto").max(120),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radioM: z.coerce.number().int().min(10).max(5000),
  activa: z.boolean(),
});

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

const HorarioColaboradorSchema = z
  .object({
    usuarioId: z.string().uuid(),
    area: z.enum(["Oficina", "Técnico", "Sin asignar"]),
    minutosComida: z.coerce.number().int().min(0).max(240),
    jornadaInicio: z.string().regex(HHMM, "Hora de entrada inválida (HH:mm)"),
    jornadaFin: z.string().regex(HHMM, "Hora de salida inválida (HH:mm)"),
    sabadoTrabaja: z.boolean(),
    sabadoInicio: z
      .string()
      .regex(HHMM, "Hora de entrada del sábado inválida (HH:mm)")
      .nullable(),
    sabadoFin: z
      .string()
      .regex(HHMM, "Hora de salida del sábado inválida (HH:mm)")
      .nullable(),
    sabadoMinutosComida: z.coerce.number().int().min(0).max(240),
  })
  .superRefine((d, ctx) => {
    if (d.jornadaFin <= d.jornadaInicio) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["jornadaFin"],
        message: "La salida no puede ser anterior a la entrada.",
      });
    }
    if (d.sabadoTrabaja) {
      if (!d.sabadoInicio || !d.sabadoFin) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sabadoInicio"],
          message: "Si trabaja los sábados, define la hora de entrada y de salida.",
        });
      } else if (d.sabadoFin <= d.sabadoInicio) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sabadoFin"],
          message: "La salida del sábado no puede ser anterior a la entrada.",
        });
      }
    }
  });

export interface ResultadoAccion {
  ok?: boolean;
  error?: string;
  /** Token en claro: solo se devuelve una vez, al generarlo. */
  token?: string;
  etiquetaNfc?: string;
}

/* ===================================================================== */
/* Autenticación                                                        */
/* ===================================================================== */

/**
 * Login: valida credenciales y establece la cookie de sesión.
 * Solo admin o supervisor pueden entrar.
 */
export async function loginConCredenciales(
  email: string,
  password: string
): Promise<{ error?: string }> {
  const resultado = await loginAuth(email, password);
  if (!resultado.ok) {
    return { error: resultado.mensaje ?? "No se pudo iniciar sesión." };
  }

  redirect("/admin/asistencia");
}

/**
 * Logout: cierra sesión y redirige al login.
 */
export async function logoutAction(): Promise<null> {
  await logoutAuth();
  redirect("/admin/login");
  return null;
}

/* ===================================================================== */
/* Ajustes manuales (correcciones de entrada/salida)                     */
/* ===================================================================== */

/**
 * Guarda o elimina un ajuste manual con parámetros tipados.
 * Solo admin. Escribe bitácora.
 */
export async function guardarAjusteManualDirecto(params: {
  usuarioId: string;
  fecha: string;
  entrada: string | null;
  salida: string | null;
  observaciones?: string;
}): Promise<{ ok?: boolean; error?: string }> {
  const sesion = await requireAdminDesdeCookies();

  const validado = AjusteSchema.safeParse(params);
  if (!validado.success) {
    return { error: "Datos del ajuste inválidos." };
  }

  const { usuarioId, fecha, entrada, salida, observaciones } = validado.data;

  const entradaVacia = !entrada || entrada.trim() === "";
  const salidaVacia = !salida || salida.trim() === "";

  // Si ambos campos vienen vacíos -> eliminar el ajuste y volver a lo
  // derivado de las marcas.
  if (entradaVacia && salidaVacia) {
    const { error } = await supabaseAdmin
      .from("ajustes_manuales")
      .delete()
      .eq("usuario_id", usuarioId)
      .eq("fecha", fecha);

    if (error) return { error: "No se pudo eliminar el ajuste." };

    await escribirBitacora(
      sesion.correo,
      "eliminar_ajuste_manual",
      "ajustes_manuales",
      usuarioId,
      null,
      { usuario_id: usuarioId, fecha, entrada: null, salida: null }
    );
    return { ok: true };
  }

  if (!entradaVacia && !salidaVacia && salida <= entrada) {
    return { error: "La salida no puede ser anterior a la entrada." };
  }

  const { data: existente } = await supabaseAdmin
    .from("ajustes_manuales")
    .select("entrada, salida, observaciones")
    .eq("usuario_id", usuarioId)
    .eq("fecha", fecha)
    .maybeSingle();

  const antes = existente
    ? {
        entrada: existente.entrada,
        salida: existente.salida,
        observaciones: existente.observaciones,
      }
    : null;

  const { error } = await supabaseAdmin
    .from("ajustes_manuales")
    .upsert(
      {
        usuario_id: usuarioId,
        fecha,
        entrada: entradaVacia ? null : entrada,
        salida: salidaVacia ? null : salida,
        observaciones: observaciones ?? null,
        creado_por: sesion.correo,
      },
      { onConflict: "usuario_id,fecha" }
    );

  if (error) return { error: "No se pudo guardar el ajuste." };

  await escribirBitacora(
    sesion.correo,
    existente ? "actualizar_ajuste_manual" : "crear_ajuste_manual",
    "ajustes_manuales",
    usuarioId,
    antes,
    {
      usuario_id: usuarioId,
      fecha,
      entrada: entradaVacia ? null : entrada,
      salida: salidaVacia ? null : salida,
      observaciones: observaciones ?? null,
    }
  );

  return { ok: true };
}

/* ===================================================================== */
/* Usuarios                                                             */
/* ===================================================================== */

/**
 * Crea o actualiza un trabajador. Solo admin.
 */
export async function guardarUsuario(
  params: z.input<typeof UsuarioSchema>
): Promise<ResultadoAccion> {
  const sesion = await requireAdminDesdeCookies();

  const validado = UsuarioSchema.safeParse(params);
  if (!validado.success) {
    return {
      error: validado.error.errors.map((e) => e.message).join(". "),
    };
  }

  const datos = validado.data;

  const { data: existente } = datos.id
    ? await supabaseAdmin
        .from("usuarios")
        .select("*")
        .eq("id", datos.id)
        .maybeSingle()
    : { data: null };

  const payload: Record<string, unknown> = {
    nombre: datos.nombre,
    correo: datos.correo,
    area: datos.area,
    minutos_comida: datos.minutosComida,
    legajo: datos.legajo ?? null,
    etiqueta_nfc: datos.etiquetaNfc ?? null,
    activo: datos.activo,
  };

  if (!datos.id) {
    // Alta: se genera token y etiqueta NFC automáticamente.
    const token = await generarToken();
    payload.token_hash = await sha256Hex(token);
    payload.token_prefijo = token.slice(0, 4);
    if (!datos.etiquetaNfc) payload.etiqueta_nfc = generarEtiquetaNfc();

    const { data: creado, error } = await supabaseAdmin
      .from("usuarios")
      .insert(payload)
      .select("id")
      .single();

    if (error || !creado) {
      return { error: `No se pudo crear el usuario: ${error?.message ?? "?"}` };
    }

    await escribirBitacora(
      sesion.correo,
      "crear_usuario",
      "usuarios",
      creado.id,
      null,
      { ...payload, token_hash: "[oculto]" }
    );

    return {
      ok: true,
      token,
      etiquetaNfc: String(payload.etiqueta_nfc ?? ""),
    };
  }

  // Actualización: NO se toca el token salvo que se pida explícitamente.
  const { data: actualizado, error } = await supabaseAdmin
    .from("usuarios")
    .update(payload)
    .eq("id", datos.id)
    .select("id")
    .single();

  if (error || !actualizado) {
    return { error: `No se pudo actualizar el usuario: ${error?.message ?? "?"}` };
  }

  await escribirBitacora(
    sesion.correo,
    "actualizar_usuario",
    "usuarios",
    datos.id,
    existente,
    { ...payload, token_hash: "[oculto]" }
  );

  return { ok: true };
}

/**
 * Genera un token nuevo para un usuario (rota el secreto de la URL).
 * Devuelve el token EN CLARO una sola vez para poder imprimirlo.
 */
export async function regenerarToken(
  usuarioId: string
): Promise<ResultadoAccion> {
  const sesion = await requireAdminDesdeCookies();

  const { data: usuario } = await supabaseAdmin
    .from("usuarios")
    .select("id, nombre")
    .eq("id", usuarioId)
    .maybeSingle();

  if (!usuario) return { error: "Usuario no encontrado." };

  const token = await generarToken();
  const hash = await sha256Hex(token);

  const { error } = await supabaseAdmin
    .from("usuarios")
    .update({ token_hash: hash, token_prefijo: token.slice(0, 4) })
    .eq("id", usuarioId);

  if (error) return { error: "No se pudo regenerar el token." };

  await escribirBitacora(
    sesion.correo,
    "regenerar_token",
    "usuarios",
    usuarioId,
    null,
    { token_hash: "[roto]" }
  );

  return { ok: true, token };
}

/**
 * Da de baja o reactiva un trabajador (no lo borra: se conserva el historial).
 */
export async function cambiarEstadoUsuario(
  usuarioId: string,
  activo: boolean
): Promise<ResultadoAccion> {
  const sesion = await requireAdminDesdeCookies();

  const { data: usuario } = await supabaseAdmin
    .from("usuarios")
    .select("id, nombre, activo")
    .eq("id", usuarioId)
    .maybeSingle();

  if (!usuario) return { error: "Usuario no encontrado." };

  const { error } = await supabaseAdmin
    .from("usuarios")
    .update({ activo })
    .eq("id", usuarioId);

  if (error) return { error: "No se pudo cambiar el estado." };

  await escribirBitacora(
    sesion.correo,
    activo ? "reactivar_usuario" : "dar_baja_usuario",
    "usuarios",
    usuarioId,
    { activo: usuario.activo },
    { activo }
  );

  return { ok: true };
}

/* ===================================================================== */
/* Horarios especiales                                                   */
/* ===================================================================== */

export async function guardarHorarioEspecial(
  params: z.input<typeof HorarioEspecialSchema>
): Promise<ResultadoAccion> {
  const sesion = await requireAdminDesdeCookies();

  const validado = HorarioEspecialSchema.safeParse(params);
  if (!validado.success) {
    return {
      error: validado.error.errors.map((e) => e.message).join(". "),
    };
  }

  const d = validado.data;

  if (d.salida <= d.entrada) {
    return { error: "La salida debe ser posterior a la entrada." };
  }

  if (d.vigenteHasta && d.vigenteHasta < d.vigenteDesde) {
    return { error: "«Vigente hasta» no puede ser anterior a «Vigente desde»." };
  }

  const payload = {
    usuario_id: d.usuarioId,
    dia_semana: d.diaSemana,
    entrada: d.entrada,
    salida: d.salida,
    vigente_desde: d.vigenteDesde,
    vigente_hasta: d.vigenteHasta,
    activo: d.activo,
  };

  const { data: existente } = d.id
    ? await supabaseAdmin
        .from("horarios_especiales")
        .select("*")
        .eq("id", d.id)
        .maybeSingle()
    : { data: null };

  if (d.id) {
    const { error } = await supabaseAdmin
      .from("horarios_especiales")
      .update(payload)
      .eq("id", d.id);
    if (error) return { error: "No se pudo guardar el horario especial." };

    await escribirBitacora(
      sesion.correo,
      "actualizar_horario_especial",
      "horarios_especiales",
      d.id,
      existente,
      payload
    );
    return { ok: true };
  }

  const { data: creado, error } = await supabaseAdmin
    .from("horarios_especiales")
    .insert(payload)
    .select("id")
    .single();

  if (error || !creado) {
    return { error: `No se pudo crear el horario especial: ${error?.message ?? "?"}` };
  }

  await escribirBitacora(
    sesion.correo,
    "crear_horario_especial",
    "horarios_especiales",
    creado.id,
    null,
    payload
  );

  return { ok: true };
}

export async function eliminarHorarioEspecial(
  id: string
): Promise<ResultadoAccion> {
  const sesion = await requireAdminDesdeCookies();

  const { data: existente } = await supabaseAdmin
    .from("horarios_especiales")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabaseAdmin
    .from("horarios_especiales")
    .delete()
    .eq("id", id);

  if (error) return { error: "No se pudo eliminar el horario especial." };

  await escribirBitacora(
    sesion.correo,
    "eliminar_horario_especial",
    "horarios_especiales",
    id,
    existente,
    null
  );

  return { ok: true };
}

/* ===================================================================== */
/* Jornada por colaborador                                                */
/* ===================================================================== */

/**
 * Guarda la jornada de un colaborador: tipo de empleado, horario de lunes a
 * viernes, receso y horario del sábado.
 *
 * Solo admin. Escribe bitácora con los valores antes/después.
 */
export async function guardarHorarioColaborador(
  params: z.input<typeof HorarioColaboradorSchema>
): Promise<ResultadoAccion> {
  const sesion = await requireAdminDesdeCookies();

  const validado = HorarioColaboradorSchema.safeParse(params);
  if (!validado.success) {
    return {
      error: validado.error.errors.map((e) => e.message).join(". "),
    };
  }

  const d = validado.data;

  const { data: existente } = await supabaseAdmin
    .from("usuarios")
    .select(
      "id, nombre, area, minutos_comida, jornada_inicio, jornada_fin, sabado_trabaja, sabado_inicio, sabado_fin, sabado_minutos_comida"
    )
    .eq("id", d.usuarioId)
    .maybeSingle();

  if (!existente) return { error: "Colaborador no encontrado." };

  const antes = {
    area: existente.area,
    minutos_comida: existente.minutos_comida,
    jornada_inicio: existente.jornada_inicio ?? null,
    jornada_fin: existente.jornada_fin ?? null,
    sabado_trabaja: existente.sabado_trabaja ?? null,
    sabado_inicio: existente.sabado_inicio ?? null,
    sabado_fin: existente.sabado_fin ?? null,
    sabado_minutos_comida: existente.sabado_minutos_comida ?? 0,
  };

  const payload = {
    area: d.area,
    minutos_comida: d.minutosComida,
    jornada_inicio: d.jornadaInicio,
    jornada_fin: d.jornadaFin,
    sabado_trabaja: d.sabadoTrabaja,
    sabado_inicio: d.sabadoTrabaja ? d.sabadoInicio : null,
    sabado_fin: d.sabadoTrabaja ? d.sabadoFin : null,
    sabado_minutos_comida: d.sabadoMinutosComida,
  };

  const { error } = await supabaseAdmin
    .from("usuarios")
    .update(payload)
    .eq("id", d.usuarioId);

  if (error) return { error: "No se pudo guardar el horario." };

  await escribirBitacora(
    sesion.correo,
    "actualizar_horario_colaborador",
    "usuarios",
    d.usuarioId,
    antes,
    payload
  );

  return { ok: true };
}

/* ===================================================================== */
/* Sedes                                                                 */
/* ===================================================================== */

export async function guardarSede(
  params: z.input<typeof SedeSchema>
): Promise<ResultadoAccion> {
  const sesion = await requireAdminDesdeCookies();

  const validado = SedeSchema.safeParse(params);
  if (!validado.success) {
    return { error: validado.error.errors.map((e) => e.message).join(". ") };
  }

  const d = validado.data;
  const payload = {
    nombre: d.nombre,
    lat: d.lat,
    lng: d.lng,
    radio_m: d.radioM,
    activa: d.activa,
  };

  const { data: existente } = d.id
    ? await supabaseAdmin.from("sedes").select("*").eq("id", d.id).maybeSingle()
    : { data: null };

  if (d.id) {
    const { error } = await supabaseAdmin
      .from("sedes")
      .update(payload)
      .eq("id", d.id);
    if (error) return { error: "No se pudo guardar la sede." };

    await escribirBitacora(
      sesion.correo,
      "actualizar_sede",
      "sedes",
      d.id,
      existente,
      payload
    );
    return { ok: true };
  }

  const { data: creada, error } = await supabaseAdmin
    .from("sedes")
    .insert(payload)
    .select("id")
    .single();

  if (error || !creada) {
    return { error: `No se pudo crear la sede: ${error?.message ?? "?"}` };
  }

  await escribirBitacora(
    sesion.correo,
    "crear_sede",
    "sedes",
    creada.id,
    null,
    payload
  );

  return { ok: true };
}

export async function eliminarSede(id: string): Promise<ResultadoAccion> {
  const sesion = await requireAdminDesdeCookies();

  const { data: existente } = await supabaseAdmin
    .from("sedes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabaseAdmin.from("sedes").delete().eq("id", id);
  if (error) return { error: "No se pudo eliminar la sede." };

  await escribirBitacora(
    sesion.correo,
    "eliminar_sede",
    "sedes",
    id,
    existente,
    null
  );

  return { ok: true };
}

/* ===================================================================== */
/* Faltas                                                               */
/* ===================================================================== */

/**
 * Marca una falta (con o sin justificación) para una persona y fecha.
 */
export async function marcarFalta(params: {
  usuarioId: string;
  fecha: string;
  motivo?: string;
  justificada?: boolean;
}): Promise<ResultadoAccion> {
  const sesion = await requireAdminDesdeCookies();

  const usuarioId = z.string().uuid().safeParse(params.usuarioId);
  const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(params.fecha);

  if (!usuarioId.success || !fecha.success) {
    return { error: "Datos de la falta inválidos." };
  }

  const { error } = await supabaseAdmin.from("faltas").upsert(
    {
      usuario_id: params.usuarioId,
      fecha: params.fecha,
      motivo: params.motivo?.trim() || null,
      justificada: params.justificada === true,
      creada_por: sesion.correo,
    },
    { onConflict: "usuario_id,fecha" }
  );

  if (error) return { error: "No se pudo marcar la falta." };

  await escribirBitacora(
    sesion.correo,
    "marcar_falta",
    "faltas",
    params.usuarioId,
    null,
    { usuario_id: params.usuarioId, fecha: params.fecha, justificada: params.justificada === true }
  );

  return { ok: true };
}

/**
 * Elimina el registro de falta (la persona vuelve a "sin registro").
 */
export async function quitarFalta(
  usuarioId: string,
  fecha: string
): Promise<ResultadoAccion> {
  const sesion = await requireAdminDesdeCookies();

  const { error } = await supabaseAdmin
    .from("faltas")
    .delete()
    .eq("usuario_id", usuarioId)
    .eq("fecha", fecha);

  if (error) return { error: "No se pudo quitar la falta." };

  await escribirBitacora(
    sesion.correo,
    "quitar_falta",
    "faltas",
    usuarioId,
    null,
    { usuario_id: usuarioId, fecha }
  );

  return { ok: true };
}

/* ===================================================================== */
/* Configuración del sistema                                             */
/* ===================================================================== */

/**
 * Actualiza un parámetro de `config` (clave/valor JSONB).
 */
export async function actualizarConfig(
  clave: string,
  valor: unknown
): Promise<ResultadoAccion> {
  const sesion = await requireAdminDesdeCookies();

  if (!/^[a-z0-9_]+$/.test(clave)) {
    return { error: "Clave de configuración inválida." };
  }

  const { data: antes } = await supabaseAdmin
    .from("config")
    .select("valor")
    .eq("clave", clave)
    .maybeSingle();

  const { error } = await supabaseAdmin
    .from("config")
    .upsert(
      { clave, valor, actualizado_en: new Date().toISOString() },
      { onConflict: "clave" }
    );

  if (error) return { error: "No se pudo actualizar la configuración." };

  await escribirBitacora(
    sesion.correo,
    "actualizar_config",
    "config",
    null,
    antes ?? null,
    { clave, valor }
  );

  return { ok: true };
}

/* ===================================================================== */
/* Helpers internos (NO exportados: no son Server Actions)               */
/* ===================================================================== */

async function requireAdminDesdeCookies() {
  const { requireAdmin } = await import("./session");
  return requireAdmin();
}

async function escribirBitacora(
  actor: string,
  accion: string,
  entidad: string,
  entidadId: string | null,
  antes: unknown,
  despues: unknown
): Promise<void> {
  try {
    await supabaseAdmin.from("bitacora").insert({
      actor,
      accion,
      entidad,
      entidad_id: entidadId,
      antes: antes ? JSON.parse(JSON.stringify(antes)) : null,
      despues: despues ? JSON.parse(JSON.stringify(despues)) : null,
    });
  } catch (err) {
    console.error("No se pudo escribir la bitácora:", err);
  }
}
