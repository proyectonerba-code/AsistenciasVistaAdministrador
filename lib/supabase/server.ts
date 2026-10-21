/**
 * Cliente de Supabase con service role (SOLO servidor del admin).
 * Nunca se expone al navegador.
 *
 * Si SUPABASE_DEMO=1 se usa el cliente simulado en memoria (modo demo).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { esDemo, obtenerClienteDemo } from "@/lib/demo/cliente";

let cliente: SupabaseClient;

if (esDemo()) {
  cliente = obtenerClienteDemo();
  console.log("[demo] Admin usando Supabase simulado en memoria (SUPABASE_DEMO=1)");
} else {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Faltan SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL) o SUPABASE_SERVICE_ROLE_KEY en el servidor del admin."
    );
  }

  cliente = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export const supabaseAdmin = cliente;
