import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import axios from "axios";
import { BACKEND_URL } from "@/lib/config";
import { ChatMessages } from "../components/chat/ChatMessage";
import { Suggestions } from "../components/chat/Suggestions";
import { Hero } from "../components/Hero";
import { Footer } from "@/components/common/Footer";
import { ChatInput } from "@/components/chat/ChatInput";
import { Sidebar } from "@/components/sidebar/Sidebar";

const supabase = createClient();

export default function Conversation() {
    const [user, setUser] = useState<User | null>(null);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
    const [isAsking, setIsAsking] = useState(false);
    const [chatError, setChatError] = useState<string | null>(null);
    const [isDark, setIsDark] = useState(false);
    const syncedUserId = useRef<string | null>(null);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        async function getInfo() {
            const { data } = await supabase.auth.getUser();
            if (data.user) setUser(data.user);
        }
        getInfo();

        // Check system preference
        if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
            setIsDark(true);
            document.documentElement.classList.add("dark");
        }
    }, []);

    useEffect(() => {
        async function getExstingSession() {
            if (user) {
                if (syncedUserId.current === user.id) return;

                const { data: { session } } = await supabase.auth.getSession();
                const jwt = session?.access_token;
                if (!jwt) return;

                await axios.get(`${BACKEND_URL}/conversation`, {
                    headers: {
                        Authorization: `Bearer ${jwt}`
                    }
                }).catch((error) => {
                    console.error("Backend auth sync failed:", error.response?.data ?? error.message);
                    throw error;
                });
                syncedUserId.current = user.id;
            }
        }
        getExstingSession().catch(() => { });
    }, [user]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        navigate("/auth");
    };

    const toggleTheme = () => {
        setIsDark(!isDark);
        document.documentElement.classList.toggle("dark");
    };

    async function askQuestion(question = input) {
        const cleanQuestion = question.trim();
        if (!cleanQuestion || isAsking) return;

        const { data: { session } } = await supabase.auth.getSession();
        const jwt = session?.access_token;
        if (!jwt) {
            navigate("/auth");
            return;
        }

        setChatError(null);
        setInput("");
        setIsAsking(true);
        setMessages((current) => [
            ...current,
            { role: "user", content: cleanQuestion },
            { role: "assistant", content: "" },
        ]);

        try {
            const response = await fetch(`${BACKEND_URL}/ask`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${jwt}`,
                },
                body: JSON.stringify({ userQuery: cleanQuestion, conversationId }),
            });

            if (!response.ok || !response.body) {
                throw new Error("Could not get an answer from backend.");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = "";

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                fullText += decoder.decode(value, { stream: true });

                const conversationMatch = fullText.match(
                    /<CONVERSATION_ID>\s*(.*?)\s*<\/CONVERSATION_ID>/
                );
                if (conversationMatch?.[1]) {
                    setConversationId(conversationMatch[1] as string);
                }
                setMessages((current) => {
                    const next = [...current];
                    const last = next[next.length - 1];
                    if (last?.role === "assistant") {
                        next[next.length - 1] = { ...last, content: fullText.replace(/<CONVERSATION_ID>[\s\S]*?<\/CONVERSATION_ID>/, "") };
                    }
                    return next;
                });
            }
        } catch (error) {
            setChatError(error instanceof Error ? error.message : "Something went wrong.");
        } finally {
            setIsAsking(false);
        }
    }

    return (
        <div className="flex h-screen w-full">

            <Sidebar
                user={user}
                isDark={isDark}
                toggleTheme={toggleTheme}
                handleSignOut={handleSignOut}
            />

   <main className="flex-1 flex flex-col items-center justify-center relative p-4 md:p-8 z-10">

                <Hero />

                <ChatInput
                    input={input}
                    setInput={setInput}
                    askQuestion={askQuestion}
                    isAsking={isAsking}
                />

                <ChatMessages messages={messages} />

                <Suggestions askQuestion={askQuestion} />

                <Footer />

            </main>
            {chatError && (
   <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      {chatError}
   </div>
)}
        </div>
    );
}
