import {
    Search,
    Sparkles,
    Code,
    Globe,
} from "lucide-react";

const SUGGESTIONS = [
    {
        title: "Summarize a topic",
        icon: <Sparkles className="size-3.5" />,
    },
    {
        title: "Explain concepts",
        icon: <Search className="size-3.5" />,
    },
    {
        title: "Help me with code",
        icon: <Code className="size-3.5" />,
    },
    {
        title: "Find latest news",
        icon: <Globe className="size-3.5" />,
    },
];

type SuggestionsProps = {
    askQuestion: (question?: string) => void;
};

export function Suggestions({ askQuestion }: SuggestionsProps) {
    return (
        <div className="flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((s, i) => (
                <button
                    key={i}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm font-medium text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/20 transition-all"
                    onClick={() => askQuestion(s.title)}
                >
                    {s.icon}
                    {s.title}
                </button>
            ))}
        </div>
    );
}