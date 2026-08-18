import { createClient as createSupabaseJsClient, type SupabaseClient } from "@supabase/supabase-js"

let client: SupabaseClient | null = null

export function hasSupabaseConfig() {
  return Boolean(
    process.env.BUN_PUBLIC_SUPABASE_URL &&
      process.env.BUN_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )
}

export function createClient() {
  if (client) return client

  const url = process.env.BUN_PUBLIC_SUPABASE_URL
  const key = process.env.BUN_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url || !key) {
    throw new Error(
      "Missing frontend Supabase env. Copy frontend/.env.example to frontend/.env and set BUN_PUBLIC_SUPABASE_URL and BUN_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    )
  }

  client = createSupabaseJsClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })

  return client
}
