import React from 'react';
import Link from 'next/link';
import { Package } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/60 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
          <Package className="w-8 h-8" />
          <span className="font-bold text-xl tracking-tight text-white">SmartLogi <span className="text-primary font-light">Customer</span></span>
        </Link>
        <nav className="hidden md:flex gap-6">
          <Link href="/" className="text-sm font-medium text-zinc-300 hover:text-white transition-colors">Track Order</Link>
          <Link href="/client" className="text-sm font-medium text-zinc-300 hover:text-white transition-colors">B2B Portal</Link>
          <span className="text-sm font-medium text-zinc-600 cursor-not-allowed" title="Coming soon">Support</span>
        </nav>
      </div>
    </header>
  );
}
