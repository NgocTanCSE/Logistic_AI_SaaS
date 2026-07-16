'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import api from '@/lib/api';

const statusColors: Record<string, 'warning' | 'info' | 'success' | 'error' | 'neutral'> = {
  PENDING: 'warning',
  APPROVED: 'info',
  PICKUP_SCHEDULED: 'info',
  PICKED_UP: 'warning',
  IN_TRANSIT: 'warning',
  INSPECTED: 'neutral',
  REFUNDED: 'success',
  REJECTED: 'error',
  CLOSED: 'neutral',
};

const statusLabels: Record<string, string> = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  PICKUP_SCHEDULED: 'Đã lên lịch pickup',
  PICKED_UP: 'Đã pickup',
  IN_TRANSIT: 'Đang vận chuyển',
  INSPECTED: 'Đã kiểm tra',
  REFUNDED: 'Đã hoàn tiền',
  REJECTED: 'Từ chối',
  CLOSED: 'Đã đóng',
};

export default function ReturnsPage() {
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReturn, setSelectedReturn] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const queryParams: any = { page, limit };
      if (statusFilter) queryParams.status = statusFilter;
      const res = await api.get('/logistics/returns', { params: queryParams });
      setReturns(res.data?.data || []);
      setTotal(res.data?.meta?.total || 0);
    } catch {
      setReturns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReturns() }, [statusFilter, page]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-ink tracking-tight">Return Management</h1>
          <p className="text-sm text-inkSoft mt-1 font-medium">Xử lý yêu cầu trả hàng (RMA)</p>
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200 text-ink text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Tất cả</option>
            <option value="PENDING">Chờ duyệt</option>
            <option value="APPROVED">Đã duyệt</option>
            <option value="REJECTED">Từ chối</option>
            <option value="REFUNDED">Đã hoàn tiền</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mã RMA</th>
                    <th className="text-left py-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Đơn hàng</th>
                    <th className="text-left py-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lý do</th>
                    <th className="text-center py-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trạng thái</th>
                    <th className="text-right py-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ngày tạo</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="text-center py-10 text-xs text-slate-400 animate-pulse">LOADING...</td></tr>
                  ) : returns.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-10 text-xs text-slate-400">No return requests found</td></tr>
                  ) : returns.map((r: any) => (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedReturn(r)}
                      className={`border-b border-slate-50 cursor-pointer transition-colors hover:bg-slate-50 ${selectedReturn?.id === r.id ? 'bg-primary/5' : ''}`}
                    >
                      <td className="py-4 px-4 font-mono font-bold text-xs text-ink">{r.returnCode}</td>
                      <td className="py-4 px-4">
                        <span className="font-mono text-xs">{r.order?.trackingCode || '-'}</span>
                        <p className="text-[10px] text-slate-400">{r.order?.recipientName || ''}</p>
                      </td>
                      <td className="py-4 px-4 text-xs text-inkSoft">{r.reason?.name || r.reasonNote || '-'}</td>
                      <td className="py-4 px-4 text-center">
                        <Badge variant={statusColors[r.status] || 'neutral'} className="text-[9px]">
                          {statusLabels[r.status] || r.status}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-right text-xs text-inkSoft">
                        {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-1">
          {selectedReturn ? (
            <Card className="bg-white">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-sm text-ink">{selectedReturn.returnCode}</h3>
                <Badge variant={statusColors[selectedReturn.status] || 'neutral'}>{statusLabels[selectedReturn.status] || selectedReturn.status}</Badge>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Đơn hàng</p>
                  <p className="text-sm font-mono">{selectedReturn.order?.trackingCode}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loại trả hàng</p>
                  <p className="text-sm">{selectedReturn.returnType}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lý do</p>
                  <p className="text-sm">{selectedReturn.reason?.name || selectedReturn.reasonNote || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Số lượng yêu cầu</p>
                  <p className="text-sm">{selectedReturn.items?.length || 0} sản phẩm</p>
                </div>
                {selectedReturn.pickupDriver && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tài xế pickup</p>
                    <p className="text-sm">{selectedReturn.pickupDriver?.user?.fullName}</p>
                  </div>
                )}
                <div className="pt-4 border-t border-slate-100 space-y-2">
                  {selectedReturn.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <Button variant="primary" size="sm" className="flex-1 text-[10px]" onClick={() => alert('Approve - will call API')}>
                        Duyệt
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 text-[10px] text-rose-600 border-rose-200" onClick={() => alert('Reject - will call API')}>
                        Từ chối
                      </Button>
                    </div>
                  )}
                  {selectedReturn.status === 'APPROVED' && (
                    <Button variant="primary" size="sm" className="w-full text-[10px]" onClick={() => alert('Schedule pickup trip')}>
                      Tạo lịch pickup
                    </Button>
                  )}
                  {selectedReturn.status === 'PICKED_UP' && (
                    <Button variant="primary" size="sm" className="w-full text-[10px]" onClick={() => alert('Inspect return items')}>
                      Kiểm tra hàng trả
                    </Button>
                  )}
                  {selectedReturn.status === 'INSPECTED' && (
                    <Button variant="primary" size="sm" className="w-full text-[10px]" onClick={() => alert('Process refund')}>
                      Xử lý hoàn tiền
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ) : (
            <Card className="bg-white p-10 text-center">
              <p className="text-sm text-slate-400">Chọn một yêu cầu trả hàng để xem chi tiết</p>
            </Card>
          )}
        </div>
      </div>

      {!loading && total > limit && (
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
          <span className="text-sm text-slate-500">
            Page {page} of {totalPages} ({total} returns)
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
