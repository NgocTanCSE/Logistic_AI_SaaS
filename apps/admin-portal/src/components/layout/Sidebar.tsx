'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface MenuItem {
  title: string;
  href: string;
  icon?: React.ReactNode;
}

export interface SidebarProps {
  items: MenuItem[];
  basePath: string; // e.g. '/admin' or '/tenant'
}

export function Sidebar({ items, basePath }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className="w-64 min-h-[100dvh] border-r border-border/50 bg-surface/50 backdrop-blur-xl flex flex-col hidden md:flex shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_0_10px_rgba(59,130,246,0.3)]">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="font-bold text-ink tracking-tight text-lg">SmartLogi</span>
        </div>
      </div>
      
      <div className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
        <div className="px-2 pb-2 mb-2 text-xs font-semibold uppercase tracking-wider text-inkSoft/60">
          Main Navigation
        </div>
        
        {items.map((item) => {
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                isActive 
                  ? 'bg-primary/10 text-primary font-medium' 
                  : 'text-inkSoft hover:bg-surfaceMuted hover:text-ink'
              }`}
            >
              <div className={`${isActive ? 'text-primary' : 'text-inkSoft group-hover:text-ink'} transition-colors`}>
                {item.icon || (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                )}
              </div>
              <span className="text-sm">{item.title}</span>
              
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
              )}
            </Link>
          );
        })}
      </div>
      
      <div className="p-4 border-t border-border/50">
        <Link href="/login" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-ember hover:bg-ember/10 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="text-sm font-medium">Log out</span>
        </Link>
      </div>
    </div>
  );
}
