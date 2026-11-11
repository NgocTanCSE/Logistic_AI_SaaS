import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-6 sm:p-8">
      <div className="text-center max-w-md">
        <h1 className="font-editorial text-[64px] leading-none font-semibold text-ink sm:text-[72px]">404</h1>
        <h2 className="mt-3 text-[17px] font-semibold text-ink">Chưa tìm thấy trang</h2>
        <p className="mt-2 text-[13px] leading-6 text-ink-soft">
          Trang bạn đang tìm không tồn tại hoặc đã được chuyển đến nơi khác.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-md border border-line px-5 text-[12px] font-medium text-ink-soft transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
        >
          Về trang đăng nhập
        </Link>
      </div>
    </div>
  );
}
