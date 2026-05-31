import { Sparkles } from "lucide-react";

export function Hero() {
    return (
        <div className="w-full max-w-2xl space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
            <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-[10px] font-bold text-primary uppercase tracking-widest mb-4">
                    <Sparkles className="size-3" />
                    Purplexity AI Beta
                </div>

                <h1 className="text-5xl font-black tracking-tighter sm:text-6xl text-foreground drop-shadow-sm">
                    Where knowledge{" "}
                    <span className="text-primary italic">begins.</span>
                </h1>

                <p className="text-muted-foreground text-lg max-w-md mx-auto leading-relaxed">
                    A minimal search experience powered by modern AI.
                </p>
            </div>
        </div>
    );
}