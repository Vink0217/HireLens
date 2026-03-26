"use client";

import { Briefcase, Settings, Users, UploadCloud, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: "Active Jobs", path: "/dashboard", icon: Briefcase },
    { name: "Global Candidates", path: "/dashboard/candidates", icon: Users },
    { name: "Batch Upload", path: "/dashboard/upload", icon: UploadCloud },
    { name: "Extraction Config", path: "/dashboard/config", icon: Settings },
  ];

  return (
    <aside className="w-64 h-screen border-r border-brand-border/30 bg-brand-bg-raised flex flex-col pt-6 sticky top-0 shrink-0">
      
      {/* Brand */}
      <div className="px-6 mb-10 flex items-center gap-3">
        <div className="w-2.5 h-2.5 rounded-full bg-brand-accent animate-pulse-slow shadow-[0_0_10px_rgba(212,234,99,0.45)]"></div>
        <span className="font-body font-bold text-2xl tracking-tight text-brand-text">
          Hire<span className="text-brand-accent">Lens</span>
        </span>
      </div>

      {/* Nav Links */}
      <div className="flex-1 flex flex-col gap-1 px-3">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              href={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? "bg-brand-accent/10 text-brand-accent" 
                  : "text-brand-text-muted hover:bg-brand-surface hover:text-brand-text"
              }`}
            >
              <Icon size={18} className={isActive ? "text-brand-accent" : "text-brand-text-muted"} />
              {item.name}
            </Link>
          );
        })}
      </div>

      {/* User / Logout */}
      <div className="p-4 border-t border-brand-border/30 mb-2">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded bg-brand-surface border border-brand-border flex items-center justify-center">
            <span className="text-xs font-bold text-brand-text">HR</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium text-brand-text truncate">Admin User</p>
            <p className="text-xs text-brand-text-muted truncate">admin@hirelens</p>
          </div>
          <Link href="/" className="text-brand-text-muted hover:text-brand-danger transition-colors cursor-pointer" title="Log Out">
            <LogOut size={16} />
          </Link>
        </div>
      </div>
    </aside>
  );
}
