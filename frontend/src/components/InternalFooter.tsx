import { Shield } from "lucide-react";

export default function InternalFooter() {
  return (
    <footer className="w-full border-t border-brand-border/30 bg-brand-bg-raised mt-16 py-8 px-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
        
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-brand-accent/70" />
          <h4 className="text-brand-text font-medium tracking-wide text-sm">HireLens Core</h4>
        </div>

        <a 
          href="https://github.com/Vink0217/HireLens" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-brand-text-muted hover:text-brand-text transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.2c3-.3 6-1.5 6-7a5.2 5.2 0 0 0-1.4-3.5 5.2 5.2 0 0 0-.1-3.5s-1.1-.3-3.5 1.3a11.6 11.6 0 0 0-6 0c-2.4-1.6-3.5-1.3-3.5-1.3a5.2 5.2 0 0 0-.1 3.5 5.2 5.2 0 0 0-1.4 3.5c0 5.4 3 6.7 6 7a4.8 4.8 0 0 0-1 3.2v4"></path></svg>
          <span>Source Code</span>
        </a>

      </div>
    </footer>
  );
}
