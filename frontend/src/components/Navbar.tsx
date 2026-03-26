import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="fixed top-0 w-full z-50 px-6 py-4 flex items-center justify-between border-b border-brand-border/30 bg-brand-bg/60 backdrop-blur-md">
      {/* Wordmark */}
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-brand-accent animate-pulse-slow"></div>
        <span className="font-body font-bold text-xl tracking-tight text-brand-text">
          Hire<span className="text-brand-accent">Lens</span>
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <button className="text-sm font-medium text-brand-text-muted hover:text-brand-text transition-colors duration-200 cursor-pointer">
          Sign In (Staff)
        </button>
        <Link href="/dashboard" className="text-sm font-medium bg-brand-surface border border-brand-border text-brand-text px-4 py-2 rounded-full hover:bg-brand-accent hover:text-black hover:border-brand-accent transition-all duration-300 transform active:scale-95 cursor-pointer">
          Launch Dashboard
        </Link>
      </div>
    </nav>
  );
}
