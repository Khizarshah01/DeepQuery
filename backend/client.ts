import { createClient } from "@supabase/supabase-js";

export function createSupabaseClient(){
    return createClient(
        process.env.PUBLIC_SUPABASE_URL!,
        process.env.SECRET_KEY_BASE!
    )
}