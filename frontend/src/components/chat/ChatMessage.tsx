import { cn } from "@/lib/utils";
import { User, Globe, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import robotAvatar from "../../robot.jpeg";

const TypewriterMarkdown = ({ content, role }: { content: string, role: string }) => {
    const [displayed, setDisplayed] = useState("");
    const isNew = useRef(!content);

    useEffect(() => {
        if (role === "user" || !isNew.current) {
            setDisplayed(content);
            return;
        }

        if (!content) return;

        let i = displayed.length;
        const timer = setInterval(() => {
            if (i >= content.length) {
                setDisplayed(content);
                clearInterval(timer);
                return;
            }
            i += 4; // Adjust typing speed here
            setDisplayed(content.substring(0, i));
        }, 10);
        
        return () => clearInterval(timer);
    }, [content, role]);

    return (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {displayed}
        </ReactMarkdown>
    );
};
type Message = {
    role: "user" | "assistant";
    content: string;
    status?: string;
};

type ChatMessagesProps = {
    messages: Message[];
    onFollowupClick?: (question: string) => void;
    user?: SupabaseUser | null;
};

export function ChatMessages({ messages, onFollowupClick, user }: ChatMessagesProps) {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    if (messages.length === 0) return null;

    return (
        <div className="space-y-6 py-4">
            {messages.map((message, index) => (
                <div
                    key={index}
                    className={cn(
                        "flex gap-3 max-w-2xl",
                        message.role === "user" ? "ml-auto flex-row-reverse" : ""
                    )}
                >
                    {/* Avatar */}
                    {message.role === "user" && (user?.user_metadata?.avatar_url || user?.user_metadata?.picture) ? (
                        <img
                            src={user.user_metadata?.avatar_url || user.user_metadata?.picture}
                            alt="You"
                            className="size-8 rounded-full object-cover shrink-0 mt-1 border border-slate-200 dark:border-white/10"
                            referrerPolicy="no-referrer"
                        />
                    ) : message.role === "assistant" ? (
                        <img
                            src={robotAvatar}
                            alt="AI"
                            className="size-8 rounded-full object-cover shrink-0 mt-1 border border-slate-200 dark:border-white/10"
                        />
                    ) : (
                        <div className="size-8 rounded-full flex items-center justify-center shrink-0 mt-1 bg-slate-900 dark:bg-white text-white dark:text-black">
                            <User className="size-4" />
                        </div>
                    )}

                    <div className="flex flex-col gap-2 min-w-0 flex-1">
                        {(() => {
                                let displayContent = message.content || "";
                                let sources: any[] = [];
                                let followups: string[] = [];

                                if (displayContent) {
                                    // Extract Sources
                                    const sourcesMatch = displayContent.match(/<SOURCES>\s*([\s\S]*?)\s*<\/SOURCES>/);
                                    if (sourcesMatch) {
                                        displayContent = displayContent.replace(sourcesMatch[0], "");
                                        try {
                                            sources = JSON.parse(sourcesMatch[1] || "[]");
                                        } catch (e) { }
                                    }
                                    
                                    // Extract Followups
                                    const followupMatch = displayContent.match(/<FOLLOWUP>\s*([\s\S]*?)\s*<\/FOLLOWUP>/);
                                    if (followupMatch) {
                                        displayContent = displayContent.replace(followupMatch[0], "");
                                        const fText = followupMatch[1] || "";
                                        if (fText.includes('<question>')) {
                                            const qMatches = fText.match(/<question>([\s\S]*?)<\/question>/g);
                                            if (qMatches) {
                                                followups = qMatches.map(q => q.replace(/<\/?question>/g, '').trim()).filter(Boolean);
                                            }
                                        } else {
                                            followups = fText.split("\n").map(q => q.trim()).filter(Boolean);
                                        }
                                    }
                                    
                                    // Clean up <ANSWER> tags from the streaming text
                                    displayContent = displayContent.replace(/<\/?ANSWER>/gi, "");
                                }

                            return (
                                <>
                                    {/* Message bubble */}
                                    <div className={cn(
                                        "text-sm leading-relaxed",
                                        !message.content && message.role === "assistant"
                                            ? "py-2" // No background for loading state
                                            : cn(
                                                "rounded-2xl px-4 py-3",
                                                message.role === "user"
                                                    ? "bg-slate-900 dark:bg-white text-white dark:text-black rounded-tr-sm ml-auto"
                                                    : "bg-slate-100 dark:bg-white/5 text-slate-800 dark:text-white/90 rounded-tl-sm w-full"
                                            )
                                    )}>
                                        <div className="break-words">
                                            {!message.content && (
                                                <div className="flex items-center gap-2.5 text-slate-500 dark:text-white/60 text-sm font-medium animate-pulse">
                                                    <Loader2 className="size-4 animate-spin" />
                                                    <span>{message.status || "Thinking..."}</span>
                                                </div>
                                            )}
                                            
                                            <div className={cn(
                                                "prose prose-sm max-w-none",
                                                !message.content && "hidden", // Hide markdown container until content exists
                                                message.role === "user" 
                                                    ? "prose-p:text-white/90 dark:prose-p:text-black/90 prose-headings:text-white dark:prose-headings:text-black prose-a:text-white dark:prose-a:text-black prose-strong:text-white dark:prose-strong:text-black" 
                                                    : "dark:prose-invert"
                                            )}>
                                                <TypewriterMarkdown 
                                                    content={displayContent.trim()} 
                                                    role={message.role} 
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Source Cards Outside Bubble */}
                                    {sources.length > 0 && (
                                        <div className="flex gap-2 flex-wrap pt-1.5 pl-1">
                                            {sources.map((src, i) => {
                                                let domain = "";
                                                try { domain = new URL(src.url).hostname.replace('www.', ''); } catch(e) {}
                                                
                                                return (
                                                    <a 
                                                        key={i} 
                                                        href={src.url} 
                                                        target="_blank" 
                                                        rel="noreferrer"
                                                        className="group flex items-center h-7 rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 transition-all duration-300 ease-in-out overflow-hidden max-w-[28px] hover:max-w-[200px]"
                                                    >
                                                        <div className="size-6 shrink-0 flex items-center justify-center p-1.5">
                                                            {domain ? (
                                                                <img 
                                                                    src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`} 
                                                                    alt={domain} 
                                                                    className="size-4 object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                                                                />
                                                            ) : (
                                                                <Globe className="size-3.5 text-slate-500 dark:text-white/50" />
                                                            )}
                                                        </div>
                                                        <span className="text-[11px] font-medium text-slate-500 dark:text-white/60 whitespace-nowrap pr-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                            {domain || `Source ${i+1}`}
                                                        </span>
                                                    </a>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Related Questions / Followups */}
                                    {followups.length > 0 && (
                                        <div className="flex flex-col gap-2 pt-4 mt-2 border-t border-slate-200 dark:border-white/10">
                                            <span className="text-[11px] font-semibold tracking-widest uppercase text-slate-500 dark:text-white/40 mb-1">
                                                Related
                                            </span>
                                            {followups.map((q, i) => (
                                                <button 
                                                    key={i} 
                                                    onClick={() => onFollowupClick?.(q)}
                                                    className="text-left text-sm text-slate-600 dark:text-white/70 bg-white dark:bg-white/5 py-2.5 px-3.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 transition-all flex items-start gap-2 group"
                                                >
                                                    <span className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-white/80 shrink-0 mt-0.5">+</span>
                                                    <span>{q}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                </div>
            ))}
            <div ref={bottomRef} />
        </div>
    );
}
