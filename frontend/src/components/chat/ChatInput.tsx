import { Sparkles, ArrowUp } from "lucide-react";

type ChatInputProps = {
    input: string;
    setInput: React.Dispatch<React.SetStateAction<string>>;
    askQuestion: (question?: string) => void;
    isAsking: boolean;
    deepResearch: boolean;
    onDeepResearchChange: (value: boolean) => void;
};

export function ChatInput({
    input,
    setInput,
    askQuestion,
    isAsking,
    deepResearch,
    onDeepResearchChange,
}: ChatInputProps) {
    return (
        <div className="w-full max-w-2xl">
            <div className="relative rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm focus-within:shadow-md focus-within:border-slate-300 dark:focus-within:border-white/20 transition-all">
                <textarea
                    className="w-full min-h-[120px] resize-none rounded-2xl bg-transparent px-5 pt-5 pb-14 text-base text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none"
                    placeholder="Type your ideas here..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            askQuestion();
                        }
                    }}
                />

                {/* Bottom bar inside the textarea box */}
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                    <span className="text-xs text-slate-400 dark:text-white/30">
                        Press Enter to search
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onDeepResearchChange(!deepResearch)}
                            className={`text-[10px] px-2.5 py-0.5 rounded-md font-medium transition-all ${deepResearch 
                                ? 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-white/90 dark:text-black' 
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-white/60 dark:hover:bg-white/20'
                            }`}
                        >
                            Deep
                        </button>
                        <button
                            disabled={!input.trim() || isAsking}
                            onClick={() => askQuestion()}
                            className="size-8 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-white/90 disabled:bg-slate-200 dark:disabled:bg-white/10 text-white dark:text-black disabled:text-slate-400 dark:disabled:text-white/20 flex items-center justify-center transition-colors"
                        >
                            {isAsking ? (
                                <Sparkles className="size-4 animate-pulse" />
                            ) : (
                                <ArrowUp className="size-4" />
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}