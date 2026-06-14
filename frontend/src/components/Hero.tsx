import { Sparkles } from "lucide-react";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";

export function Hero() {
    return (
        <div className="w-full max-w-2xl space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
            <div className="text-center space-y-5">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-xs font-semibold">
                    <Sparkles className="size-3.5" />
                    <AnimatedShinyText
                        className="text-slate-600 dark:text-white/60 mx-0 max-w-none"
                        shimmerWidth={70}
                    >
                        Better then search
                    </AnimatedShinyText>
                </div>

                <h1 className="text-4xl font-normal text-normal sm:text-5xl text-slate-900 dark:text-white">
                    Where knowledge{" "}
                    <span className="italic font-bold text-gray-900 dark:text-gray-400">begins.</span>
                </h1>
            </div>
        </div>
    );
}