'use client';

import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';

interface Props {
  children: ReactNode;
  /** thừa `fallback` để trang tự quyết định giao diện phụ. */
  fallback?: ReactNode;
  /**
   * Dùng để các trang báo lỗi mà không ném `console.error` ra cửa sổ developer.
   */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
          <h2 className="text-[15px] font-semibold text-ink">Đã có lỗi xảy ra</h2>
          <p className="max-w-sm text-[13px] leading-6 text-ink-soft">
            {this.state.error?.message || 'Phát sinh lỗi không mong muốn.'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-2 h-9 rounded-md border border-line px-4 text-[12px] font-medium text-ink-soft transition-colors hover:border-line-strong hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
          >
            Tải lại
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
