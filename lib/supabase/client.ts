/**
 * Cliente de Supabase con anon key (cliente, solo para lectura pública si fuera necesario).
 * El admin usa service role en servidor; este cliente es para referencia.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
}

export const supabaseClient = createClient(url, anonKey);
