import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
export default function Auth() {

    async function login(provider: "github" | "google") {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: provider,
        })
        if (error) {
            console.error("Error during login:", error);
        } else {
            console.log("Login successful, redirecting to:", data.url);
        }
    }
    return (
        <div>
            <h1>Authentication Page</h1>
            <button onClick={() => login("google")}>Sign in with Google</button>
            <button onClick={() => login("github")}>Sign in with GitHub</button>
        </div>
    );
}   