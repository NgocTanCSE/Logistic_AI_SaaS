'use client';

import { useState, useRef, useEffect } from 'react';
import api from '@/lib/api';

type ChatMsg = { role: string; content: string; images?: string[] };

/**
 * Trợ lý AI phân tích. Giao diện floating ngoài cùng được giữ nguyên để không
 * ảnh hưởng các trang đang dùng, chỉ đổi token sang hệ thống editorial.
 */
export default function AIChatButton() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      setMessages((m) => [...m, { role: 'assistant', content: 'Vui lòng tải lên file ảnh (jpg, png, gif).' }]);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessages((m) => [...m, { role: 'assistant', content: 'Ảnh quá lớn (>5MB). Vui lòng chọn ảnh nhỏ hơn.' }]);
      return;
    }
    try {
      const base64 = await fileToBase64(file);
      setPendingImages([base64]);
      setMessages((m) => [...m, { role: 'user', content: `Đã tải ảnh: ${file.name} (${Math.round(file.size / 1024)}KB). Mô tả nội dung ảnh này giúp tôi hiểu hơn.`, images: [base64] }]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', content: 'Lỗi khi tải ảnh: ' + (err as Error)?.message }]);
    }
    e.target.value = '';
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const userMsg: ChatMsg = { role: 'user', content: text };
    if (pendingImages.length > 0) {
      userMsg.images = [...pendingImages];
    }
    setPendingImages([]);
    setMessages((m) => [...m, userMsg]);
    setLoading(true);
    try {
      const res = await api.post('/ai/v1/chat', {
        messages: [{ role: 'user', content: text }],
        context: 'Bạn là trợ lý AI phân tích logistics. Trả lời ngắn gọn, dựa trên dữ liệu đơn hàng, tồn kho và vận chuyển của tenant này.',
        images: userMsg.images,
      });
      const data = res.data;
      const reply = typeof data?.content === 'string' ? data.content : (data?.message || 'Không nhận được phản hồi.');
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: 'Lỗi kết nối AI: ' + (e?.message || 'unknown') + '. Vui lòng thử lại.' },
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
        className="fixed bottom-5 right-5 z-50 h-10 rounded-md border border-line bg-surface px-3 text-[12px] font-semibold text-accent transition-colors hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
        aria-label="Mở trợ lý AI phân tích"
        title="Trợ lý AI phân tích logistics"
      >
        Hỏi AI
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex h-[580px] w-[420px] flex-col rounded-lg border border-line bg-canvas">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <span className="text-sm font-semibold text-ink">Trợ lý AI — SmartLogi</span>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setMessages([]);
            setPendingImages([]);
          }}
          className="rounded-md p-1.5 text-ink-soft hover:text-ink hover:bg-surface-alt focus-visible:ring-2 focus-visible:ring-accent/30 outline-none"
          aria-label="Đóng"
          title="Đóng"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-ink-soft">
              Xin chào! Tôi là trợ lý AI phân tích logistics. Tôi có thể giúp bạn:
            </p>
            <ul className="text-xs text-ink-soft space-y-1">
              <li>Giải thích các chức năng: đơn hàng, tồn kho, vận chuyển, admin</li>
              <li>Phân tích dữ liệu, dự báo nhu cầu & thời gian giao hàng</li>
              <li>Đọc hiểu hình ảnh (tải ảnh lên để phân tích)</li>
            </ul>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className="space-y-1">
              <div
                className={
                  m.role === 'user'
                    ? 'ml-auto max-w-[85%] rounded-lg border border-line bg-surface-alt px-3 py-2 text-sm text-ink'
                    : 'mr-auto max-w-[85%] rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink'
                }
              >
                {m.content}
              </div>
              {m.images && m.images.length > 0 && (
                <div className="ml-auto max-w-[85%]">
                  {m.images.map((img, j) => (
                    <img
                      key={j}
                      src={img}
                      alt="Ảnh tải lên"
                      className="mt-1 max-w-[120px] max-h-[80px] rounded-lg object-cover border border-line"
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
        {loading && (
          <div className="mr-auto max-w-[85%] rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-ink-soft" />
              Đang phân tích
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-line p-3">
        {pendingImages.length > 0 && (
          <div className="mb-2 flex gap-2 overflow-x-auto">
            {pendingImages.map((img, i) => (
              <img
                key={i}
                src={img}
                alt="Preview"
                className="h-16 w-16 rounded-lg object-cover border border-line"
              />
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            capture="environment"
            onChange={handleImageUpload}
            className="hidden"
            aria-label="Tải ảnh lên"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || pendingImages.length >= 3}
            className="h-9 rounded-md border border-line bg-surface-alt px-2.5 text-[12px] font-medium text-ink-soft transition-colors hover:border-line-strong hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 disabled:opacity-50"
            aria-label="Tải ảnh lên"
            title="Quét mã / tải ảnh lên để AI phân tích"
          >
            Tải ảnh
          </button>
          <input
            className="flex-1 rounded-md border border-line bg-surface-alt px-3 py-2 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/20"
            placeholder="Hỏi về đơn hàng, tồn kho, vận chuyển..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (pendingImages.length > 0 || input.trim()) && send()}
            disabled={loading}
          />
          <button
            type="button"
            onClick={send}
            disabled={loading || (!input.trim() && pendingImages.length === 0)}
            className="h-9 rounded-md bg-accent px-3 text-[12px] font-medium text-surface hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 disabled:opacity-50"
          >
            {loading ? '…' : 'Gửi'}
          </button>
        </div>
      </div>
    </div>
  );
}
