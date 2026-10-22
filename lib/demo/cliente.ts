/**
 * Cliente Supabase simulado en memoria (modo demo) — singleton del proceso.
 *
 * IMPORTANTE: el cliente se guarda en `globalThis` con un `Symbol.for`.
 * En Next.js el server action y la página se compilan en bundles distintos y
 * cada uno crea su propia copia de este módulo. Con un `let` normal cada
 * bundle tenía SU PROPIA base de datos en memoria: lo que se guardaba desde
 * un formulario no se veía al recargar la página (y al revés).
 * Con `globalThis` + `Symbol.for` los bundles comparten la misma instancia.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { crearSupabaseDemo } from "./supabase-demo";
import { crearDatosDemo } from "./datos";

const CLAVE = Symbol.for("nerba.asistencias.clienteDemo");

type GlobalConDemo = typeof globalThis & { [CLAVE]?: SupabaseClient };

export function obtenerClienteDemo(): SupabaseClient {
  const g = globalThis as GlobalConDemo;
  if (!g[CLAVE]) {
    const { cliente } = crearSupabaseDemo(crearDatosDemo());
    g[CLAVE] = cliente as unknown as SupabaseClient;
    console.log("[demo] Admin usando Supabase simulado en memoria (SUPABASE_DEMO=1)");
  }
  return g[CLAVE];
}

/**
 * ¿El modo demo está activo?
 *
 * Se recorta el valor: las variables de entorno pueden traer espacios
 * sobrantes según de dónde vengan (archivo .env, panel de Vercel, o un
 * `set VAR=1 && ...` en cmd.exe, que deja "1 " con espacio final).
 */
export function esDemo(): boolean {
  return process.env.SUPABASE_DEMO?.trim() === "1";
}
