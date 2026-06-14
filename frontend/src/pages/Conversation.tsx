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

interface Conversation {
    id: string;
    title: string;
    updatedAt: string;
}

const supabase = createClient();

export default function Conversation() {
    const [user, setUser] = useState<User | null>(null);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string; status?: string }[]>([]);
    const [isAsking, setIsAsking] = useState(false);
    const [chatError, setChatError] = useState<string | null>(null);
    const [isDark, setIsDark] = useState(() => {
        // Initialize from saved preference or whatever the early script already applied
        const saved = localStorage.getItem('theme');
        if (saved === 'dark') return true;
        if (saved === 'light') return false;
        return document.documentElement.classList.contains('dark');
    });
    const syncedUserId = useRef<string | null>(null);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [isLoadingConversation, setIsLoadingConversation] = useState(false);
    const [activeResearchJob, setActiveResearchJob] = useState<{id: string; status: string; result?: string; query: string} | null>(null);
    const researchPollRef = useRef<any>(null);
    const [useDeepResearch, setUseDeepResearch] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        async function getInfo() {
            const { data } = await supabase.auth.getUser();
            if (data.user) setUser(data.user);
        }
        getInfo();
        // Theme is already applied by the inline script in index.html + localStorage.
        // We only sync user here.
    }, []);

    // Fetch conversations when user becomes available (in addition to the sync effect)
    useEffect(() => {
        if (user) {
            fetchConversations().catch(() => {});
        } else {
            setConversations([]);
            setIsLoadingConversation(false);
        }
    }, [user]);

    // Cleanup research polling on unmount
    useEffect(() => {
        return () => {
            if (researchPollRef.current) {
                clearInterval(researchPollRef.current);
            }
        };
    }, []);

    useEffect(() => {
        async function getExstingSession() {
            if (user) {
                if (syncedUserId.current === user.id) return;

                const { data: { session } } = await supabase.auth.getSession();
                const jwt = session?.access_token;
                if (!jwt) return;

                try {
                    const { data } = await axios.get(`${BACKEND_URL}/conversation`, {
                        headers: {
                            Authorization: `Bearer ${jwt}`
                        }
                    });
                    setConversations(data.conversations || []);
                } catch (error) {
                    console.error("Backend auth sync failed:", (error as any)?.response?.data ?? (error as any)?.message);
                }
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
        const newIsDark = !isDark;
        setIsDark(newIsDark);

        if (newIsDark) {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
    };

    const fetchConversations = async () => {
        if (!user) return;
        const { data: { session } } = await supabase.auth.getSession();
        const jwt = session?.access_token;
        if (!jwt) return;

        try {
            const { data } = await axios.get(`${BACKEND_URL}/conversation`, {
                headers: {
                    Authorization: `Bearer ${jwt}`
                }
            });
            setConversations(data.conversations || []);
        } catch (e) {
            console.error("Failed to fetch conversations list");
        }
    };

    const startNewConversation = () => {
        setConversationId(null);
        setMessages([]);
        setChatError(null);
        setIsSidebarOpen(false);
        setIsLoadingConversation(false);
        setActiveResearchJob(null);
        if (researchPollRef.current) {
            clearInterval(researchPollRef.current);
            researchPollRef.current = null;
        }
    };

    async function startDeepResearch(query: string) {
        const cleanQuery = query.trim();
        if (!cleanQuery || isAsking || activeResearchJob) return;

        const { data: { session } } = await supabase.auth.getSession();
        const jwt = session?.access_token;
        if (!jwt) {
            navigate("/auth");
            return;
        }

        setChatError(null);
        setInput("");
        setIsAsking(true);
        setIsSidebarOpen(false);
        setMessages((current) => [
            ...current,
            { role: "user", content: cleanQuery },
            { role: "assistant", content: "", status: "Starting deep research..." },
        ]);

        const updateResearchMessage = (content: string, status?: string) => {
            setMessages((current) => {
                const next = [...current];
                const lastIndex = next.length - 1;
                const last = next[lastIndex];

                if (last?.role === "assistant") {
                    next[lastIndex] = {
                        role: "assistant",
                        content,
                        status,
                    };
                }

                return next;
            });
        };

        try {
            const res = await axios.post(`${BACKEND_URL}/research`, {
                conversationId,
                userQuery: cleanQuery
            }, {
                headers: { Authorization: `Bearer ${jwt}` }
            });

            const jobId = res.data.jobId;
            if (res.data.conversationId) {
                setConversationId(res.data.conversationId);
            }

            setActiveResearchJob({ id: jobId, status: 'PENDING', query: cleanQuery });
            let isResearchDone = false;

            // Start polling
            if (researchPollRef.current) clearInterval(researchPollRef.current);
            const pollResearch = async () => {
                try {
                    const { data: { session: pollSession } } = await supabase.auth.getSession();
                    const pollJwt = pollSession?.access_token;
                    if (!pollJwt) return;

                    const statusRes = await axios.get(`${BACKEND_URL}/research/status/${jobId}`, {
                        headers: { Authorization: `Bearer ${pollJwt}` }
                    });

                    const { status, result } = statusRes.data;
                    setActiveResearchJob(prev => prev ? { ...prev, status, result } : null);

                    if (status === 'PENDING') {
                        updateResearchMessage("", "Queued for deep research...");
                    } else if (status === 'PROCESSING') {
                        updateResearchMessage("", "Deep research in progress...");
                    }

                    if (status === 'COMPLETED' || status === 'FAILED') {
                        isResearchDone = true;
                        if (researchPollRef.current) {
                            clearInterval(researchPollRef.current);
                            researchPollRef.current = null;
                        }

                        if (status === 'COMPLETED') {
                            updateResearchMessage(result || "Deep research completed, but no result was returned.");
                            fetchConversations().catch(() => {});
                        } else {
                            updateResearchMessage("Deep research failed. Try again later.");
                        }

                        setActiveResearchJob(null);
                        setIsAsking(false);
                    }
                } catch (e) {
                    console.error("Research poll error");
                }
            };

            await pollResearch();
            if (!isResearchDone) {
                researchPollRef.current = setInterval(pollResearch, 4000);
            }
        } catch (e) {
            updateResearchMessage("Failed to start deep research.");
            setChatError("Failed to start deep research.");
            setActiveResearchJob(null);
            setIsAsking(false);
        }
    }

    const handleSend = (question = input) => {
        if (useDeepResearch) {
            startDeepResearch(question);
            setUseDeepResearch(false); // reset mode after this deep request
        } else {
            askQuestion(question);
        }
    };

    const loadConversation = async (id: string) => {
        if (!user) return;
        const { data: { session } } = await supabase.auth.getSession();
        const jwt = session?.access_token;
        if (!jwt) return;

        setIsLoadingConversation(true);
        setIsSidebarOpen(false);

        try {
            const { data } = await axios.get(`${BACKEND_URL}/conversation/${id}`, {
                headers: {
                    Authorization: `Bearer ${jwt}`
                }
            });

            const conv = data.conversationHistory;
            if (conv && conv.messages) {
                const formatted = conv.messages.map((m: any) => ({
                    role: m.role === "USER" ? "user" : "assistant" as "user" | "assistant",
                    content: m.content,
                }));
                setConversationId(id);
                setMessages(formatted);
                setChatError(null);
                setActiveResearchJob(null);
                if (researchPollRef.current) {
                    clearInterval(researchPollRef.current);
                    researchPollRef.current = null;
                }
            }
        } catch (e) {
            console.error("Failed to load conversation");
            setChatError("Could not load that conversation.");
        } finally {
            setIsLoadingConversation(false);
        }
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

                const statusMatch = fullText.match(/<STATUS>\s*([\s\S]*?)\s*<\/STATUS>/g);
                let latestStatus = "Thinking..."; // Default
                if (statusMatch) {
                    const last = statusMatch[statusMatch.length - 1] || "";
                    latestStatus = last.replace(/<\/?STATUS>/g, "").trim();
                }

                setMessages((current) => {
                    const next = [...current];
                    const last = next[next.length - 1];
                    if (last && last.role === "assistant") {
                        let cleanText = fullText.replace(/<CONVERSATION_ID>[\s\S]*?<\/CONVERSATION_ID>/g, "");
                        cleanText = cleanText.replace(/<STATUS>[\s\S]*?<\/STATUS>\n?/g, "");
                        next[next.length - 1] = { 
                            role: last.role,
                            content: cleanText,
                            status: latestStatus 
                        };
                    }
                    return next;
                });
            }

            // Refresh sidebar list (new convs or updated order)
            fetchConversations().catch(() => {});
        } catch (error) {
            setChatError(error instanceof Error ? error.message : "Something went wrong.");
        } finally {
            setIsAsking(false);
        }
    }

    return (
        <div className={`flex h-screen w-full transition-colors duration-500 ${!isLoadingConversation && messages.length === 0 ? 'bg-slate-50 dark:bg-[#0d0d12]' : 'bg-white dark:bg-[#111111]'}`}>
            {user && (
                <Sidebar
                    user={user}
                    isDark={isDark}
                    toggleTheme={toggleTheme}
                    handleSignOut={handleSignOut}
                    isOpen={isSidebarOpen}
                    setIsOpen={setIsSidebarOpen}
                    conversations={conversations}
                    currentConversationId={conversationId}
                    onNewConversation={startNewConversation}
                    onSelectConversation={loadConversation}
                    isLoadingConversation={isLoadingConversation}
                />
            )}

            <main className="flex-1 flex flex-col relative overflow-hidden">
                
                {/* Top bar with menu button and auth */}
                <div className="flex items-center justify-between px-4 py-3 shrink-0">
                    {user && !isSidebarOpen && (
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="size-9 rounded-lg flex items-center justify-center text-slate-500 dark:text-white/40 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                        >
                            <Menu className="size-5" />
                        </button>
                    )}

                    <div className="flex items-center gap-2 ml-auto">
                        {/* GitHub repo link */}
                        <a
                            href="https://github.com/Khizarshah01/deepquery"
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
                {!isLoadingConversation && messages.length === 0 && (
                    <>
                        <div className="absolute top-[-15%] right-[-15%] w-[50vw] h-[50vw] rounded-full bg-purple-300/40 dark:bg-purple-600/20 blur-[120px] pointer-events-none"></div>
                        <div className="absolute bottom-[-15%] left-[-15%] w-[50vw] h-[50vw] rounded-full bg-blue-400/30 dark:bg-blue-600/15 blur-[120px] pointer-events-none"></div>
                        <div className="bg-grainy" style={{ WebkitMaskImage: 'radial-gradient(circle at center, transparent 15%, black 85%)', maskImage: 'radial-gradient(circle at center, transparent 15%, black 85%)' }}></div>
                    </>
                )}

                {/* Content area */}
                {isLoadingConversation ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-white/50">
                            <div className="size-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm">Loading conversation...</span>
                        </div>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center px-4 pb-20 relative z-10">
                        <div className="w-full max-w-2xl flex flex-col items-center space-y-8">
                            <Hero />
                            <ChatInput
                                input={input}
                                setInput={setInput}
                                askQuestion={handleSend}
                                isAsking={isAsking}
                                deepResearch={useDeepResearch}
                                onDeepResearchChange={setUseDeepResearch}
                            />
                            <Suggestions askQuestion={handleSend} />
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col w-full max-w-3xl mx-auto px-4 overflow-hidden">
                        <div className="flex-1 overflow-y-auto pb-6">
                            <ChatMessages messages={messages} onFollowupClick={askQuestion} user={user} />
                        </div>
                        <div className="py-4 shrink-0">
                            <ChatInput
                                input={input}
                                setInput={setInput}
                                askQuestion={handleSend}
                                isAsking={isAsking}
                                deepResearch={useDeepResearch}
                                onDeepResearchChange={setUseDeepResearch}
                            />
                        </div>
                    </div>
                )}

                {/* Footer only on home */}
                {!isLoadingConversation && messages.length === 0 && (
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
