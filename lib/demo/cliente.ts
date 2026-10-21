/**
 * Cliente Supabase simulado (modo demo) — singleton en memoria.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { crearSupabaseDemo } from "./supabase-demo";
import { crearDatosDemo } from "./datos";

let instancia: { cliente: unknown } | null = null;

export function obtenerClienteDemo(): SupabaseClient {
  if (!instancia) {
    instancia = crearSupabaseDemo(crearDatosDemo());
  }
  return instancia.cliente as unknown as SupabaseClient;
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
