import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Search, Sparkles } from "lucide-react";

type ChatInputProps = {
    input: string;
    setInput: React.Dispatch<React.SetStateAction<string>>;
    askQuestion: (question?: string) => void;
    isAsking: boolean;
};

export function ChatInput({
    input,
    setInput,
    askQuestion,
    isAsking,
}: ChatInputProps) {
    return (
        <div className="relative group w-full max-w-2xl">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 blur-2xl rounded-3xl opacity-0 group-focus-within:opacity-100 transition-all duration-500" />

            <div className="relative flex items-center bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-2 shadow-2xl focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/30 transition-all">
                <div className="pl-4 pr-2 text-muted-foreground">
                    <Search className="size-5" />
                </div>

                <Input
                    className="flex-1 border-none bg-transparent shadow-none focus-visible:ring-0 text-xl h-14 placeholder:text-muted-foreground/50"
                    placeholder="What would you like to know?"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            askQuestion();
                        }
                    }}
                />

                <Button
                    size="icon"
                    className="rounded-xl size-14 shrink-0 shadow-lg shadow-primary/20 transition-transform active:scale-95"
                    disabled={!input.trim() || isAsking}
                    onClick={() => askQuestion()}
                >
                    {isAsking ? (
                        <Sparkles className="size-6 animate-pulse" />
                    ) : (
                        <ArrowRight className="size-6" />
                    )}
                </Button>
            </div>
        </div>
    );
}