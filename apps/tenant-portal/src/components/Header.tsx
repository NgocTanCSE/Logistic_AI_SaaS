export default function Header() {
  return (
    <header className="h-20 w-full border-b border-slate-200 bg-white/80 sticky top-0 z-10 flex items-center justify-between px-8 backdrop-blur">
      <div className="flex-1">
        <div className="relative w-96">
          <input
            type="text"
            placeholder="Search orders, SKU, drivers..."
            className="w-full rounded-full border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-4 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <div className="absolute left-4 top-2.5 text-slate-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
          Systems online
        </span>
      </div>
    </header>
  );
}
