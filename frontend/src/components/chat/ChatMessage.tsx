import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";
import { useEffect, useRef } from "react";

type Message = {
    role: "user" | "assistant";
    content: string;
};

type ChatMessagesProps = {
    messages: Message[];
};

export function ChatMessages({ messages }: ChatMessagesProps) {
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
                    <div className={cn(
                        "size-8 rounded-full flex items-center justify-center shrink-0 mt-1",
                        message.role === "user"
                            ? "bg-slate-900 dark:bg-white text-white dark:text-black"
                            : "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/60"
                    )}>
                        {message.role === "user" ? (
                            <User className="size-4" />
                        ) : (
                            <Bot className="size-4" />
                        )}
                    </div>

                    {/* Message bubble */}
                    <div className={cn(
                        "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                        message.role === "user"
                            ? "bg-slate-900 dark:bg-white text-white dark:text-black rounded-tr-sm"
                            : "bg-slate-100 dark:bg-white/5 text-slate-800 dark:text-white/90 rounded-tl-sm"
                    )}>
                        <div className="whitespace-pre-wrap break-words">
                            {message.content || (
                                <span className="inline-flex items-center gap-1.5 text-slate-400 dark:text-white/40">
                                    <span className="size-1.5 rounded-full bg-current animate-pulse" />
                                    <span className="size-1.5 rounded-full bg-current animate-pulse [animation-delay:0.2s]" />
                                    <span className="size-1.5 rounded-full bg-current animate-pulse [animation-delay:0.4s]" />
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            ))}
            <div ref={bottomRef} />
        </div>
    );
}