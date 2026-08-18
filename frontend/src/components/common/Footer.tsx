export function Footer() {
    return (
        <div className="absolute bottom-10 flex items-center gap-6 text-[10px] font-medium text-muted-foreground uppercase tracking-widest opacity-50">
            <a
                href="https://github.com/Khizarshah01/deepquery"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
            >
                GitHub
            </a>

            <span className="h-3 w-px bg-border/50" />

            <span>© 2026 DeepQuery</span>
        </div>
    );
}
