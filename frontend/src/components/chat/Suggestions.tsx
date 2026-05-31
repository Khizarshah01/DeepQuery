import { Button } from "@/components/ui/button";
import {
    MessageSquare,
    Plus,
    Search,
    Sparkles,
} from "lucide-react";

const SUGGESTIONS = [
    {
        title: "Summarize a topic",
        icon: <Sparkles className="size-4" />,
    },
    {
        title: "Explain complex concepts",
        icon: <MessageSquare className="size-4" />,
    },
    {
        title: "Find the latest news",
        icon: <Search className="size-4" />,
    },
    {
        title: "Help me with code",
        icon: <Plus className="size-4" />,
    },
];

type SuggestionsProps = {
    askQuestion: (question?: string) => void;
};

export function Suggestions({ askQuestion }: SuggestionsProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
            {SUGGESTIONS.map((s, i) => (
                <Button
                    key={i}
                    variant="outline"
                    className="h-auto py-4 px-5 justify-start gap-4 bg-card/50 backdrop-blur-sm hover:bg-accent border-border/50 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md group"
                    onClick={() => askQuestion(s.title)}
                >
                    <div className="size-10 rounded-xl bg-background flex items-center justify-center shadow-inner group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        {s.icon}
                    </div>

                    <div className="text-left">
                        <span className="block font-bold text-sm">
                            {s.title}
                        </span>

                        <span className="block text-[10px] text-muted-foreground">
                            Try this prompt
                        </span>
                    </div>
                </Button>
            ))}
        </div>
    );
}