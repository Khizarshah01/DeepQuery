import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function createSupabaseClient() {
    const url = process.env.PUBLIC_SUPABASE_URL?.trim();
    const key = process.env.SECRET_KEY_BASE?.trim();

    if (!url || !key) {
        throw new Error(
            "Missing PUBLIC_SUPABASE_URL or SECRET_KEY_BASE. Copy backend/.env.example to backend/.env and add your Supabase project URL and service_role key."
        );
    }

    if (!cached) {
        cached = createClient(url, key);
    }

    return cached;
}