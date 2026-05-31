import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import {
    Plus,
    History,
    Moon,
    Sun,
    LogOut,
    User as UserIcon,
} from "lucide-react";

type SidebarProps = {
    user: User | null;
    isDark: boolean;
    toggleTheme: () => void;
    handleSignOut: () => void;
};

export function Sidebar({
    user,
    isDark,
    toggleTheme,
    handleSignOut,
}: SidebarProps) {
    return (
        <div className="hidden md:flex w-64 flex-col border-r bg-muted/30 backdrop-blur-sm z-10">
            
            {/* Top */}
            <div className="p-4">
                <Button
                    variant="outline"
                    className="w-full justify-start gap-2 shadow-sm border-dashed hover:border-primary/50 transition-all hover:bg-background"
                >
                    <Plus className="size-4" />

                    New Thread

                    <span className="ml-auto text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        Ctrl K
                    </span>
                </Button>
            </div>

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto px-2 py-4">
                <div className="mb-4 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
                    Recent Activity
                </div>

                <div className="space-y-1">
                    {[1, 2, 3].map((i) => (
                        <button
                            key={i}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all group"
                        >
                            <History className="size-4 shrink-0 group-hover:text-primary transition-colors" />

                            <span className="truncate text-left flex-1">
                                Previous search {i}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Bottom */}
            <div className="border-t p-4 space-y-3 bg-muted/50">

                {/* Theme */}
                <div className="flex items-center justify-between px-2">
                    <span className="text-xs text-muted-foreground font-medium">
                        Appearance
                    </span>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                        onClick={toggleTheme}
                    >
                        {isDark ? (
                            <Sun className="size-4" />
                        ) : (
                            <Moon className="size-4" />
                        )}
                    </Button>
                </div>

                {/* User */}
                {user ? (
                    <div className="space-y-3">

                        <div className="flex items-center gap-3 px-2 py-1">
                            <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                                <UserIcon className="size-4 text-primary" />
                            </div>

                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-semibold truncate leading-none mb-1">
                                    {user.email?.split("@")[0]}
                                </p>

                                <p className="text-[10px] text-muted-foreground truncate">
                                    {user.email}
                                </p>
                            </div>
                        </div>

                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={handleSignOut}
                        >
                            <LogOut className="size-4" />

                            <span className="text-xs font-medium">
                                Sign out
                            </span>
                        </Button>
                    </div>
                ) : (
                    <Button
                        variant="default"
                        size="sm"
                        className="w-full shadow-lg shadow-primary/20"
                    >
                        Sign in
                    </Button>
                )}
            </div>
        </div>
    );
}