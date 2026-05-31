import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import {
    Plus,
    History,
    Moon,
    Sun,
    LogOut,
    User as UserIcon,
    X
} from "lucide-react";

type SidebarProps = {
    user: User | null;
    isDark: boolean;
    toggleTheme: () => void;
    handleSignOut: () => void;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
};

export function Sidebar({
    user,
    isDark,
    toggleTheme,
    handleSignOut,
    isOpen,
    setIsOpen,
}: SidebarProps) {
    return (
        <div className={`h-screen flex flex-col border-r border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0a0a0a] transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'w-64 min-w-[16rem]' : 'w-0 min-w-0 border-r-0'}`}>

            {/* Header */}
            <div className="flex items-center justify-between p-4 shrink-0">
                <span className="font-bold text-sm text-slate-900 dark:text-white whitespace-nowrap">Purplexity</span>
                <button onClick={() => setIsOpen(false)} className="size-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                    <X className="size-4" />
                </button>
            </div>

            {/* New Thread */}
            <div className="px-3 pb-3 shrink-0">
                <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-slate-300 dark:border-white/15 text-sm text-slate-600 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors whitespace-nowrap">
                    <Plus className="size-4 shrink-0" />
                    New Thread
                    <span className="ml-auto text-[10px] text-slate-400 bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded">
                        Ctrl K
                    </span>
                </button>
            </div>

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto px-2 py-2">
                <div className="mb-3 px-3 text-[10px] font-bold text-slate-400 dark:text-white/30 uppercase tracking-[0.2em] whitespace-nowrap">
                    Recent
                </div>
                <div className="space-y-0.5">
                    {[1, 2, 3].map((i) => (
                        <button
                            key={i}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors whitespace-nowrap"
                        >
                            <History className="size-4 shrink-0" />
                            <span className="truncate text-left flex-1">
                                Previous search {i}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Bottom */}
            <div className="border-t border-slate-200 dark:border-white/10 p-3 space-y-2 shrink-0">
                {/* Theme */}
                <div className="flex items-center justify-between px-2">
                    <span className="text-xs text-slate-400 dark:text-white/30 font-medium whitespace-nowrap">
                        Appearance
                    </span>
                    <button
                        className="size-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                        onClick={toggleTheme}
                    >
                        {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
                    </button>
                </div>

                {/* User */}
                {user ? (
                    <div className="space-y-2">
                        <div className="flex items-center gap-3 px-2 py-1">
                            <div className="size-8 rounded-full bg-slate-900 dark:bg-white flex items-center justify-center shrink-0">
                                <UserIcon className="size-3.5 text-white dark:text-black" />
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-semibold truncate leading-none mb-1 text-slate-900 dark:text-white whitespace-nowrap">
                                    {user.email?.split("@")[0]}
                                </p>
                                <p className="text-[10px] text-slate-400 dark:text-white/30 truncate whitespace-nowrap">
                                    {user.email}
                                </p>
                            </div>
                        </div>
                        <button
                            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors whitespace-nowrap"
                            onClick={handleSignOut}
                        >
                            <LogOut className="size-4" />
                            <span className="text-xs font-medium">Sign out</span>
                        </button>
                    </div>
                ) : (
                    <Button
                        variant="default"
                        size="sm"
                        className="w-full"
                    >
                        Sign in
                    </Button>
                )}
            </div>
        </div>
    );
}