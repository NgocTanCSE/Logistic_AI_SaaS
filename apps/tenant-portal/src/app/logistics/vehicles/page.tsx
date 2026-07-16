'use client';
import { useState } from 'react';
import useSWR from 'swr';
import api from '@/lib/api';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';

const fetcher = (url: string) => api.get(url).then(res => res.data);

export default function VehiclesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const limit = 15;

  const { data, isLoading, mutate } = useSWR(
    `/vehicles?page=${page}&limit=${limit}&search=${search}`,
    fetcher
  );

  const vehicles = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 0 };

  const handleAdd = async () => {
    const plateNumber = prompt("Plate Number:");
    if (!plateNumber) return;
    try {
      await api.post('/vehicles', { plateNumber, type: 'TRUCK_1T' });
      mutate();
    } catch (err) { console.error("Error adding asset", err); setError('Failed to add asset'); }
  };

  const handleDelete = async (id: string) => {
    
    try {
      await api.delete(`/vehicles/${id}`);
      mutate();
    } catch (err) { console.error("Error deleting vehicle", err); setError('Failed to delete vehicle'); }
  };

  const handleEdit = async (vehicle: any) => {
    const newPlate = prompt("Edit Plate Number:", vehicle.plateNumber);
    if (!newPlate) return;
    try {
      await api.patch(`/vehicles/${vehicle.id}`, { plateNumber: newPlate });
      mutate();
    } catch (err) { console.error("Error updating vehicle", err); setError('Failed to update vehicle'); }
  };

  const getStatusVariant = (status: string) => {
    switch(status) {
      case 'ACTIVE': return 'success';
      case 'MAINTENANCE': return 'warning';
      case 'INACTIVE': return 'error';
      default: return 'neutral';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      {error && <ErrorBanner message={error} onRetry={() => mutate()} />}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-bold text-ink tracking-tight">
            Fleet Assets
          </h1>
          <p className="text-sm text-inkSoft mt-2 font-medium">Manage your transport equipment, technical specifications, and service logs.</p>
        </div>
        <Button variant="primary" onClick={handleAdd} className="gap-2 shadow-lg shadow-primary/20">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4"/></svg>
          Register Asset
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        <div className="relative w-full max-w-md group">
          <Input 
            placeholder="Search by plate number or model..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            icon={<svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
          />
        </div>
      </div>

      <Card className="animate-slide-up">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-border">
                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Plate Identity</th>
                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Asset Type</th>
                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Max Load (KG)</th>
                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Operation Status</th>
                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Syncing Fleet Registry...</span>
                    </div>
                  </td>
                </tr>
              ) : vehicles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No vehicles registered in the fleet.</td>
                </tr>
              ) : (
                vehicles.map((v: any) => (
                  <tr key={v.id} className="hover:bg-slate-50/80 transition-all group">
                    <td className="px-8 py-6">
                      <div className="font-bold text-ink font-mono tracking-tight">{v.plateNumber}</div>
                      <div className="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-wider">VIN: {v.id.split('-')[0]}</div>
                    </td>
                    <td className="px-8 py-6">
                       <Badge variant="info">{v.type.replace('_', ' ')}</Badge>
                    </td>
                    <td className="px-8 py-6">
                       <div className="text-sm font-bold text-ink">{v.capacityKg?.toLocaleString() || '0'} <span className="text-slate-400 font-medium">KG</span></div>
                    </td>
                    <td className="px-8 py-6">
                       <Badge variant={getStatusVariant(v.status)}>{v.status}</Badge>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" className="p-2 h-9 w-9 rounded-xl text-slate-400 hover:text-primary" onClick={() => handleEdit(v)}>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </Button>
                        <Button variant="ghost" size="sm" className="p-2 h-9 w-9 rounded-xl text-slate-400 hover:text-red-500" onClick={() => handleDelete(v.id)}>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && meta.totalPages > 1 && (
          <div className="p-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
             <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Asset Registry Page <span className="text-ink">{page}</span> of <span className="text-ink">{meta.totalPages}</span>
            </span>
            <div className="flex gap-2">
              <Button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                variant="outline"
                size="sm"
                className="font-bold tracking-widest text-[10px]"
              >
                PREVIOUS
              </Button>
              <Button
                onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                disabled={page === meta.totalPages}
                variant="outline"
                size="sm"
                className="font-bold tracking-widest text-[10px]"
              >
                NEXT
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

