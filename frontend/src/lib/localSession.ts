import axios from "axios";
import type { User } from "@supabase/supabase-js";
import { BACKEND_URL } from "./config";

export const REPO_URL = "https://github.com/Khizarshah01/deepquery";

export const LIVE_DEEP_SEARCH_NOTICE =
  "Deep Search is not available in the live demo. Clone the repo and run it locally to use the full research worker.";

const TOKEN_KEY = "deepquery_local_token";
const USER_KEY = "deepquery_local_user";

export function isLocalHost() {
    return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
}

export function getLocalToken() {
    return localStorage.getItem(TOKEN_KEY);
}

export function getLocalUser(): User | null {
    try {
        const raw = localStorage.getItem(USER_KEY);
        if (!raw) return null;
        const user = JSON.parse(raw) as { id: string; email: string; name: string };
        return {
            id: user.id,
            email: user.email,
            user_metadata: { full_name: user.name },
            app_metadata: { provider: "local" },
        } as User;
    } catch {
        return null;
    }
}

export function clearLocalSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

export async function startLocalSession(): Promise<User> {
    const { data } = await axios.post(`${BACKEND_URL}/local-session`);
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    return getLocalUser()!;
}
