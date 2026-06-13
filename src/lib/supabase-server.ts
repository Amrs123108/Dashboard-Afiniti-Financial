// Cliente Supabase SOLO para el servidor (API routes).
// Usa la service role key: nunca importar desde componentes de cliente.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cliente: SupabaseClient | null = null;

export function supabaseServer(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en .env.local");
  }
  if (!cliente) {
    cliente = createClient(url, key, { auth: { persistSession: false } });
  }
  return cliente;
}
