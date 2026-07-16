'use client';

import { usePathname } from 'next/navigation';

export function TopBar() {
  const pathname = usePathname();
  
  // Format pathname for breadcrumb (e.g. /admin/dashboard -> Dashboard)
  const pathParts = pathname.split('/').filter(Boolean);
  const currentPage = pathParts.length > 1 
    ? pathParts[pathParts.length - 1].charAt(0).toUpperCase() + pathParts[pathParts.length - 1].slice(1)
    : 'Home';

  return (
    <header className="h-16 border-b border-border/50 bg-surface/30 backdrop-blur-md sticky top-0 z-30 px-8 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-ink">{currentPage}</h2>
        {/* Glow indicator behind title */}
        <div className="absolute w-20 h-10 bg-primary/20 blur-2xl -z-10 rounded-full"></div>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="p-2 rounded-full hover:bg-surfaceMuted text-inkSoft hover:text-ink transition-colors relative">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-ember border-2 border-background"></span>
        </button>
        
        <div className="h-8 w-px bg-border/50"></div>
        
        <button className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-accent to-primary flex items-center justify-center p-0.5">
            <div className="w-full h-full bg-background rounded-full border-2 border-transparent flex items-center justify-center overflow-hidden">
               <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" alt="User" className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-sm font-medium text-ink leading-tight">Admin User</p>
            <p className="text-xs text-inkSoft leading-tight">System Admin</p>
          </div>
        </button>
      </div>
    </header>
  );
}
