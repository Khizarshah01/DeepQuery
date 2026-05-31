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
import { Menu, Moon, Sun, Github } from "lucide-react";

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
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
        <div className={`flex h-screen w-full transition-colors duration-500 ${messages.length === 0 ? 'bg-slate-50 dark:bg-[#0d0d12]' : 'bg-white dark:bg-[#111111]'}`}>
            <Sidebar
                user={user}
                isDark={isDark}
                toggleTheme={toggleTheme}
                handleSignOut={handleSignOut}
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
            />

            <main className="flex-1 flex flex-col relative overflow-hidden">
                
                {/* Top bar with menu button and auth */}
                <div className="flex items-center justify-between px-4 py-3 shrink-0">
                    {!isSidebarOpen && (
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="size-9 rounded-lg flex items-center justify-center text-slate-500 dark:text-white/40 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                        >
                            <Menu className="size-5" />
                        </button>
                    )}

                    <div className="flex items-center gap-2">
                        {/* GitHub repo link */}
                        <a
                            href="https://github.com/Khizarshah01/purplexity"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="size-9 rounded-lg flex items-center justify-center text-slate-500 dark:text-white/40 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                        >
                            <Github className="size-4" />
                        </a>

                        {/* Theme toggle */}
                        <button
                            onClick={toggleTheme}
                            className="size-9 rounded-lg flex items-center justify-center text-slate-500 dark:text-white/40 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                        >
                            {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
                        </button>

                        {/* Show Sign in / Sign up if not logged in */}
                        {!user && (
                            <>
                                <button
                                    onClick={() => navigate("/auth")}
                                    className="px-4 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                                >
                                    Sign in
                                </button>
                                <button
                                    onClick={() => navigate("/auth")}
                                    className="px-4 py-1.5 rounded-lg text-sm font-medium bg-slate-900 dark:bg-white text-white dark:text-black hover:bg-slate-800 dark:hover:bg-white/90 transition-colors"
                                >
                                    Sign up
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Background Effects (Only on home screen) */}
                {messages.length === 0 && (
                    <>
                        <div className="absolute top-[-15%] right-[-15%] w-[50vw] h-[50vw] rounded-full bg-purple-200/40 dark:bg-purple-600/20 blur-[120px] pointer-events-none"></div>
                        <div className="absolute bottom-[-15%] left-[-15%] w-[50vw] h-[50vw] rounded-full bg-blue-200/30 dark:bg-blue-600/15 blur-[120px] pointer-events-none"></div>
                        <div className="bg-grainy" style={{ WebkitMaskImage: 'radial-gradient(circle at center, transparent 15%, black 85%)', maskImage: 'radial-gradient(circle at center, transparent 15%, black 85%)' }}></div>
                    </>
                )}

                {/* Content area */}
                {messages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center px-4 pb-20 relative z-10">
                        <div className="w-full max-w-2xl flex flex-col items-center space-y-8">
                            <Hero />
                            <ChatInput
                                input={input}
                                setInput={setInput}
                                askQuestion={askQuestion}
                                isAsking={isAsking}
                            />
                            <Suggestions askQuestion={askQuestion} />
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col w-full max-w-3xl mx-auto px-4 overflow-hidden">
                        <div className="flex-1 overflow-y-auto pb-6">
                            <ChatMessages messages={messages} />
                        </div>
                        <div className="py-4 shrink-0">
                            <ChatInput
                                input={input}
                                setInput={setInput}
                                askQuestion={askQuestion}
                                isAsking={isAsking}
                            />
                        </div>
                    </div>
                )}

                {/* Footer only on home */}
                {messages.length === 0 && (
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center z-10">
                        <Footer />
                    </div>
                )}
            </main>
            
            {chatError && (
               <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive z-50">
                  {chatError}
               </div>
            )}
        </div>
    );
}
