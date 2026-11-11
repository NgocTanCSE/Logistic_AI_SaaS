export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <div className="text-center">
        <div
          className="mx-auto mb-4 flex h-8 w-48 flex-col gap-2"
          aria-busy="true"
          aria-live="polite"
        >
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-2 w-full rounded bg-surface-alt animate-pulse" />
          ))}
        </div>
        <p className="text-[12px] font-medium text-ink-soft">Đang tải dữ liệu…</p>
      </div>
    </div>
  );
}
