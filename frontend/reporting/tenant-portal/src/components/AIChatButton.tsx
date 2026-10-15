'use client';

import { useState, useRef, useEffect } from 'react';
import api from '@/lib/api';

export default function AIChatButton() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setLoading(true);
    try {
      const res = await api.post('/ai/v1/chat', {
        messages: [{ role: 'user', content: text }],
        context: 'Tóm tắt ngắn gọn các số liệu logistic (đơn hàng, tồn kho, vận đơn) dựa trên ngữ cảnh tenant.',
      });
      const data = res.data;
      const reply = typeof data?.content === 'string' ? data.content : (data?.message || 'Không nhận được phản hồi.');
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: 'Lỗi kết nối AI: ' + (e?.message || 'unknown') },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-floating hover:scale-105 transition-transform focus-visible:ring-2 focus-visible:ring-primary outline-none"
        aria-label="Trò chuyện AI phân tích"
        title="Trợ lý AI phân tích logistics"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12.25c0 .414.156.816.42 1.126l2.5 2.75a.75.75 0 0 1-1.08.96l-.5-.45C8.62 16.25 8 15.18 8 14v-.75c0-.97.78-1.75 1.75-1.75h.5c.414 0 .75-.336.75-.75v-1c0-.138-.112-.25-.25-.25h-2.5A2.25 2.25 0 0 0 6 10.75V14a3 3 0 0 0 3 2.75v2.25a.75.75 0 0 0 1.5 0v-1.694a1.5 1.5 0 0 1 1.06-1.428l3-1A1.5 1.5 0 0 1 22 16.25V18a.75.75 0 0 0 1.5 0v-1.75a3 3 0 0 0-3-2.75h-1.75a.75.75 0 0 1 0-1.5h2.5a2.25 2.25 0 0 0 2.25-2.25V8a1.5 1.5 0 0 0-1.5-1.5h-2.5a.75.75 0 0 1 0-1.5v1.694a1.5 1.5 0 0 1-1.06 1.428l-3 1A1.5 1.5 0 0 1 8 8.75z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v6" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex h-[520px] w-96 flex-col rounded-2xl border border-slate-200 bg-background shadow-floating">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
        <span className="text-sm font-semibold text-ink">AI phân tích logistics</span>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setMessages([]);
          }}
          className="rounded-lg p-1 text-ink-soft hover:text-ink hover:bg-surface-alt focus-visible:ring-2 focus-visible:ring-primary outline-none"
          aria-label="Đóng"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 no-scrollbar">
        {messages.length === 0 ? (
          <p className="text-xs text-ink-soft">Nhập câu hỏi (đơn hàng, tồn kho, vận chuyển…), tôi sẽ phân tích.</p>
        ) : (
          messages.map((m, i) => (
            <div key={i} className="space-y-1">
              <div
                className={
                  m.role === 'user'
                    ? 'ml-auto max-w-[80%] rounded-2xl bg-primary/5 px-3 py-2 text-sm text-ink'
                    : 'mr-auto max-w-[80%] rounded-2xl bg-surface-alt px-3 py-2 text-sm text-ink'
                }
              >
                {m.content}
              </div>
            </div>
          ))
        )}
        {loading && <p className="text-xs text-ink-soft">Đang phân tích…</p>}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-2">
          <input
            className="flex-1 rounded-xl border border-slate-200 bg-surface-alt px-3 py-2 text-sm text-ink placeholder-ink/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Nhập câu hỏi…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            disabled={loading}
          />
          <button
            type="button"
            onClick={send}
            disabled={loading || !input.trim()}
            className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary outline-none disabled:opacity-50"
          >
            Gửi
          </button>
        </div>
      </div>
    </div>
  );
}
