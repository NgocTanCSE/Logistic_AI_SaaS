'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Can } from '@/components/auth/Can';
import api from '@/lib/api';

type Zone = {
  id: string;
  code: string;
  type: string;
  racks: Rack[];
};

type Rack = {
  id: string;
  code: string;
  aisle: string;
  bins: Bin[];
};

type Bin = {
  id: string;
  barcode: string;
  status?: string;
};

export default function WarehouseStructurePage() {
  const { id } = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [zones, setZones] = useState<Zone[]>([]);
  const [warehouseName, setWarehouseName] = useState('Loading...');

  // Modals state
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [zoneForm, setZoneForm] = useState({ code: '', type: 'PICKING' });

  const [isRackModalOpen, setIsRackModalOpen] = useState(false);
  const [rackForm, setRackForm] = useState({ zoneId: '', code: '', aisle: '', rows: 1, levels: 1 });

  const [isBinModalOpen, setIsBinModalOpen] = useState(false);
  const [binForm, setBinForm] = useState({ rackId: '', barcode: '', rowIndex: 1, levelIndex: 1 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) fetchStructure();
  }, [id, token]);

  const fetchStructure = async () => {
    setError('');
    try {
      setLoading(true);
      const res = await api.get(`/warehouses/${id}`);
      setWarehouseName(res.data?.name || 'Unknown Warehouse');
      
      const fetchedZones = res.data?.zones || [];
      // Calculate derived bin statuses if inventory present
      const processedZones = fetchedZones.map((z: any) => ({
        ...z,
        racks: (z.racks || []).map((r: any) => ({
          ...r,
          bins: (r.bins || []).map((b: any) => ({
            ...b,
            status: b.inventory && b.inventory.length > 0 ? 'FULL' : 'EMPTY'
          }))
        }))
      }));
      setZones(processedZones);
    } catch (err) {
      console.error('Failed to fetch warehouse structure', err);
      setError('Failed to load warehouse structure');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/locations/zones', { ...zoneForm, warehouseId: id });
      setIsZoneModalOpen(false);
      setZoneForm({ code: '', type: 'PICKING' });
      fetchStructure();
    } catch (err) { console.error('Failed to add zone', err); setError('Failed to add zone'); } finally { setSaving(false); }
  };

  const handleCreateRack = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/locations/racks', rackForm);
      setIsRackModalOpen(false);
      setRackForm({ zoneId: '', code: '', aisle: '', rows: 1, levels: 1 });
      fetchStructure();
    } catch (err) { console.error('Failed to add rack', err); setError('Failed to add rack'); } finally { setSaving(false); }
  };

  const handleCreateBin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/locations/bins', { ...binForm, warehouseId: id, maxWeightKg: 1000, maxVolumeCbm: 1.5 });
      setIsBinModalOpen(false);
      setBinForm({ rackId: '', barcode: '', rowIndex: 1, levelIndex: 1 });
      fetchStructure();
    } catch (err) { console.error('Failed to add bin', err); setError('Failed to add bin'); } finally { setSaving(false); }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      {error && <ErrorBanner message={error} onRetry={fetchStructure} />}
      <div className="mb-10 flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()} className="p-2 h-10 w-10 rounded-full">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>
        </Button>
        <div>
          <div className="flex items-center gap-2 mb-1">
             <Badge variant="info" className="text-[8px] py-0">STRUCTURE MGMT</Badge>
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Facility Layout</span>
          </div>
          <h1 className="text-3xl font-bold text-ink tracking-tight">{warehouseName}</h1>
        </div>
        <div className="ml-auto">
          <Can perform="warehouses:manage">
            <Button variant="primary" size="sm" className="gap-2 font-bold tracking-widest text-[10px] uppercase" onClick={() => setIsZoneModalOpen(true)}>
              + Add Zone
            </Button>
          </Can>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Mapping Physical Layout...</span>
          </div>
        ) : (
          zones.map((zone) => (
            <div key={zone.id} className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-ink">{zone.code}</h2>
                  <Badge variant="neutral">{zone.type}</Badge>
                </div>
                <Can perform="warehouses:manage">
                  <Button variant="outline" size="sm" className="text-[10px] font-bold tracking-widest uppercase" onClick={() => {
                    setRackForm(prev => ({ ...prev, zoneId: zone.id }));
                    setIsRackModalOpen(true);
                  }}>Add Rack</Button>
                </Can>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {zone.racks.map((rack) => (
                  <Card key={rack.id} className="p-6 bg-white/40 border-white/60">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="font-bold text-ink">{rack.code}</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Aisle {rack.aisle}</p>
                      </div>
                      <Can perform="warehouses:manage">
                        <Button variant="ghost" size="sm" className="text-primary font-bold text-[10px] tracking-widest" onClick={() => {
                          setBinForm(prev => ({ ...prev, rackId: rack.id }));
                          setIsBinModalOpen(true);
                        }}>+ ADD BIN</Button>
                      </Can>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {rack.bins.map((bin) => (
                        <div 
                          key={bin.id} 
                          title={bin.barcode}
                          className={`
                            h-10 rounded-lg border flex items-center justify-center text-[8px] font-bold transition-all cursor-pointer
                            ${bin.status === 'EMPTY' ? 'bg-slate-50 border-slate-200 text-slate-400' : 
                              bin.status === 'FULL' ? 'bg-primary/10 border-primary/30 text-primary' : 
                              'bg-amber-50 border-amber-200 text-amber-600'}
                          `}
                        >
                          {bin.barcode.split('-').pop()}
                        </div>
                      ))}
                      {rack.bins.length === 0 && <div className="text-[10px] text-slate-400 font-medium col-span-4">No bins configured.</div>}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modals */}
      {isZoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <Card className="w-full max-w-md bg-white p-6">
            <h2 className="text-xl font-bold mb-4">Add Zone</h2>
            <form onSubmit={handleCreateZone} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1">Zone Code</label>
                <Input required value={zoneForm.code} onChange={e => setZoneForm({...zoneForm, code: e.target.value})} placeholder="e.g. ZONE-A" />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Type</label>
                <select className="w-full border rounded-xl p-2.5 text-sm" value={zoneForm.type} onChange={e => setZoneForm({...zoneForm, type: e.target.value})}>
                  <option value="PICKING">PICKING</option>
                  <option value="BULK">BULK</option>
                  <option value="RECV">RECEIVING</option>
                  <option value="DISP">DISPATCH</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button type="button" variant="ghost" onClick={() => setIsZoneModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>Save Zone</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {isRackModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <Card className="w-full max-w-md bg-white p-6">
            <h2 className="text-xl font-bold mb-4">Add Rack</h2>
            <form onSubmit={handleCreateRack} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1">Rack Code</label>
                <Input required value={rackForm.code} onChange={e => setRackForm({...rackForm, code: e.target.value})} placeholder="e.g. RACK-01" />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Aisle</label>
                <Input required value={rackForm.aisle} onChange={e => setRackForm({...rackForm, aisle: e.target.value})} placeholder="e.g. A1" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold mb-1">Rows</label>
                  <Input type="number" required value={rackForm.rows} onChange={e => setRackForm({...rackForm, rows: parseInt(e.target.value)})} min={1} />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold mb-1">Levels</label>
                  <Input type="number" required value={rackForm.levels} onChange={e => setRackForm({...rackForm, levels: parseInt(e.target.value)})} min={1} />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button type="button" variant="ghost" onClick={() => setIsRackModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>Save Rack</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {isBinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <Card className="w-full max-w-md bg-white p-6">
            <h2 className="text-xl font-bold mb-4">Add Bin</h2>
            <form onSubmit={handleCreateBin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1">Bin Barcode</label>
                <Input required value={binForm.barcode} onChange={e => setBinForm({...binForm, barcode: e.target.value})} placeholder="e.g. BIN-A1-01" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold mb-1">Row Index</label>
                  <Input type="number" required value={binForm.rowIndex} onChange={e => setBinForm({...binForm, rowIndex: parseInt(e.target.value)})} min={1} />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold mb-1">Level Index</label>
                  <Input type="number" required value={binForm.levelIndex} onChange={e => setBinForm({...binForm, levelIndex: parseInt(e.target.value)})} min={1} />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button type="button" variant="ghost" onClick={() => setIsBinModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>Save Bin</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
