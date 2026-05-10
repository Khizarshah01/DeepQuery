import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.BUN_PUBLIC_SUPABASE_URL!,
    process.env.BUN_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
