import { cn } from "@/lib/utils";

type Message = {
    role: "user" | "assistant";
    content: string;
};

type ChatMessagesProps = {
    messages: Message[];
};

export function ChatMessages({ messages }: ChatMessagesProps) {
    if (messages.length === 0) return null;

    return (
        <div className="max-h-[42vh] space-y-4 overflow-y-auto rounded-2xl border bg-card/70 p-4 shadow-xl backdrop-blur-xl">
            {messages.map((message, index) => (
                <div
                    key={index}
                    className={cn(
                        "rounded-xl px-4 py-3 text-sm leading-6",
                        message.role === "user"
                            ? "ml-auto max-w-[80%] bg-primary text-primary-foreground"
                            : "mr-auto max-w-[90%] border bg-background text-foreground"
                    )}
                >
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-widest opacity-60">
                        {message.role === "user" ? "You" : "Purplexity"}
                    </div>

                    <div className="whitespace-pre-wrap">
                        {message.content || "Thinking..."}
                    </div>
                </div>
            ))}
        </div>
    );
}