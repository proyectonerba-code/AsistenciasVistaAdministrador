/**
 * Capa de auth del panel — aislada para poder cambiarla fácilmente (ej. Google después).
 *
 * Usa Supabase Auth (email + contraseña) con sesión en cookies (SSR) y la
 * tabla `admins` para roles. Toda verificación de sesión y rol ocurre en el
 * servidor, en cada route handler y server action, no solo en el middleware.
 */
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/server";
import { crearSupabaseServerClient } from "@/lib/supabase/server-client";
import { esDemo, obtenerClienteDemo } from "@/lib/demo/cliente";

export type RolAdmin = "admin" | "supervisor";

export interface SesionAdmin {
  correo: string;
  rol: RolAdmin;
}

/** Cookie de sesión usada en modo demo. */
const COOKIE_DEMO = "demo-sesion";
/** Contraseña del modo demo. */
const PASSWORD_DEMO = "demo1234";

/**
 * Lee la sesión actual desde las cookies del servidor.
 * Devuelve null si no hay sesión válida o el correo no está en `admins`.
 */
export async function obtenerSesion(): Promise<SesionAdmin | null> {
  if (esDemo()) {
    const correo = cookies().get(COOKIE_DEMO)?.value;
    if (!correo) return null;
    const rol = await obtenerRol(correo);
    if (!rol) return null;
    return { correo, rol };
  }

  try {
    const supabase = crearSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) return null;

    const correo = data.user.email;
    if (!correo) return null;

    const rol = await obtenerRol(correo);
    if (!rol) return null;

    return { correo, rol };
  } catch {
    return null;
  }
}

/**
 * Consulta el rol del administrador en la tabla `admins`.
 */
export async function obtenerRol(correo: string): Promise<RolAdmin | null> {
  const cliente = esDemo() ? obtenerClienteDemo() : supabaseAdmin;

  const { data } = await cliente
    .from("admins")
    .select("correo, rol")
    .eq("correo", correo)
    .maybeSingle();

  if (!data) return null;
  return data.rol as RolAdmin;
}

/**
 * Login con email y contraseña vía Supabase Auth (deja cookie de sesión).
 * En modo demo valida contra la lista de admins simulada.
 */
export async function login(
  email: string,
  password: string
): Promise<{ ok: boolean; mensaje?: string; sesion?: SesionAdmin }> {
  const correo = email.trim().toLowerCase();

  if (esDemo()) {
    if (password !== PASSWORD_DEMO) {
      return { ok: false, mensaje: "Correo o contraseña incorrectos." };
    }
    const rol = await obtenerRol(correo);
    if (!rol) {
      return {
        ok: false,
        mensaje: "Tu correo no tiene acceso al panel de administración.",
      };
    }
    cookies().set(COOKIE_DEMO, correo, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 8,
    });
    return { ok: true, sesion: { correo, rol } };
  }

  const supabase = crearSupabaseServerClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: correo,
    password,
  });

  if (error || !data.user) {
    return { ok: false, mensaje: "Correo o contraseña incorrectos." };
  }

  const correoSesion = data.user.email ?? "";

  const rol = await obtenerRol(correoSesion);
  if (!rol) {
    await supabase.auth.signOut();
    return {
      ok: false,
      mensaje: "Tu correo no tiene acceso al panel de administración.",
    };
  }

  return { ok: true, sesion: { correo: correoSesion, rol } };
}

/**
 * Cierra la sesión (borra la cookie).
 */
export async function logout(): Promise<void> {
  if (esDemo()) {
    cookies().delete(COOKIE_DEMO);
    return;
  }
  try {
    const supabase = crearSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    // Si falla, la cookie se ignora: el layout volverá a validar la sesión.
  }
}

/**
 * ¿La sesión tiene el rol requerido? `admin` puede todo; `supervisor` solo lectura.
 */
export function requiereRol(
  sesion: SesionAdmin | null,
  rolRequerido: RolAdmin
): boolean {
  if (!sesion) return false;
  if (sesion.rol === "admin") return true;
  return rolRequerido === "supervisor";
}
