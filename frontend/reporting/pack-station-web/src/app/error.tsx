'use client';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-6 sm:p-8">
      <div className="text-center max-w-md">
        <h2 className="text-[15px] font-semibold text-ink sm:text-[18px]">
          Đã có lỗi xảy ra
        </h2>
        <p className="mt-2 text-[13px] leading-6 text-ink-soft">
          {error?.message || 'Phát sinh lỗi không mong muốn.'}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 h-10 rounded-md border border-line px-5 text-[12px] font-medium text-ink-soft transition-colors hover:border-line-strong hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
        >
          Thử lại
        </button>
      </div>
    </div>
  );
}
