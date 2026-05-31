export function Footer() {
    return (
        <div className="absolute bottom-10 flex items-center gap-6 text-[10px] font-medium text-muted-foreground uppercase tracking-widest opacity-50">
            <span className="hover:text-primary transition-colors cursor-pointer">
                About
            </span>

            <span className="hover:text-primary transition-colors cursor-pointer">
                Privacy
            </span>

            <span className="hover:text-primary transition-colors cursor-pointer">
                Terms
            </span>

            <span className="h-3 w-px bg-border/50" />

            <span>© 2026 Purplexity</span>
        </div>
    );
}