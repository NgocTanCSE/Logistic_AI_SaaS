export default function Loading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-canvas">
      <div className="flex flex-col items-center gap-3 text-ink-soft">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent" />
        <p className="text-[12px] text-ink-faint">Đang tải dữ liệu…</p>
      </div>
    </div>
  );
}
