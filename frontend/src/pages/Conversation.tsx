import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import axios from "axios";
import { BACKEND_URL } from "@/lib/config";

const supabase = createClient();

export default function Conversation() {

    const [user, setUser] = useState<User | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        async function getInfo() {
            const { data, error } = await supabase.auth.getUser();
            if (data.user) setUser(data.user);
        }
        getInfo();
    }, []);

    useEffect(() => {
      async function getExstingSession() {

      if(user){
        const {data: {session}} = await supabase.auth.getSession();
        const jwt = session?.access_token;
        axios.post(`${BACKEND_URL}/conversations`, {}, {
            headers: {
                Authorization: jwt
            }
        }); 
      }
    }
  }, [user]);
    return (
        <div>
            {!user && <button onClick={() => navigate("/auth")}>singin</button>}

            {user?.email}
            {user && <button onClick={() => {
                supabase.auth.signOut()
                setUser(null);
            }}>Sing out</button>}
        </div>
    );
}   