'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import api from '@/lib/api';
import dynamic from 'next/dynamic';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

// Dynamically import LeafletMap to avoid SSR issues
const LeafletMap = dynamic(() => import('map-components').then(m => m.LeafletMap).catch(() => () => <div />), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-100 animate-pulse flex items-center justify-center text-slate-400 font-bold">LOADING MAP ENGINE...</div>
});

type Driver = {
  id: string;
  name: string;
  licenseExpiry: string;
  status: 'AVAILABLE' | 'ON_TRIP' | 'OFF_DUTY';
};

type Trip = {
  id: string;
  tripCode: string;
  driverId: string | null;
  driverName?: string;
  vehicle: string;
  ordersCount: number;
  isAiGenerated?: boolean;
};

export default function DispatchTowerPage() {
  const [isBrowser, setIsBrowser] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRoutes, setActiveRoutes] = useState<any[]>([]);
  
  // AI Polling States
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [aiCompleted, setAiCompleted] = useState(false);
  const [jobResult, setJobResult] = useState<any>(null);

  // AI Feedback Modal States
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackTarget, setFeedbackTarget] = useState<Trip | null>(null);
  const [feedbackForm, setFeedbackForm] = useState({ reason: '', expectedRoute: '' });
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const [fleetLocations, setFleetLocations] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState<'orders' | 'drivers'>('drivers');
  
  // Drag & Drop States
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setIsBrowser(true);
    fetchUnassignedOrders();
    fetchDispatchData();

    const gpsInterval = setInterval(async () => {
      try {
        const res = await api.get('/gps/active-fleet');
        const data = res.data?.data || res.data || [];
        if (Array.isArray(data) && data.length > 0) {
          setFleetLocations(data.map((d: any) => ({
            id: d.driverId || d.id,
            lat: Number(d.lat) || 10.762622,
            lng: Number(d.lng) || 106.660172,
            label: d.label || `Driver ${d.driverId || 'unknown'}`
          })));
        }
      } catch {
        setFleetLocations([]);
      }
    }, 10000);

    return () => clearInterval(gpsInterval);
  }, []);

  const fetchDispatchData = async () => {
    try {
      const [driversRes, tripsRes] = await Promise.all([
        api.get('/drivers'),
        api.get('/trips')
      ]);
      setDrivers(driversRes.data || []);
      setTrips(tripsRes.data || []);
    } catch (e) {
      console.error('Failed to fetch dispatch data', e);
      setDrivers([]);
      setTrips([]);
    }
  };

  const fetchUnassignedOrders = async () => {
    setLoading(true);
    try {
      const response = await api.get('/logistics/dispatch/unassigned-orders');
      setOrders(response.data || []);
    } catch (err) {
      console.error('Failed to fetch unassigned orders', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // --- BƯỚC 3: AI Polling Logic with Timeout ---
  useEffect(() => {
    let interval: any;
    if (currentJobId && optimizing) {
      interval = setInterval(async () => {
        setPollCount(prev => {
          if (prev >= 10) {
            setOptimizing(false);
            clearInterval(interval);
            window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'AI Routing timeout after 30s. Route too complex or service unavailable.', type: 'error' } }));
            return 0;
          }
          return prev + 1;
        });

        try {
          const res = await api.get(`/logistics/routing/jobs/${currentJobId}`);
          
if (res.data?.status === 'COMPLETED') {
             setOptimizing(false);
             clearInterval(interval);
             setPollCount(0);
             setAiCompleted(true);
             setJobResult(res.data);
             
             if (res.data.routes) {
               visualizeRoutes(res.data.routes);
             }
             
             setOrders([]);
          } else if (res.data?.status === 'FAILED') {
            setOptimizing(false);
            clearInterval(interval);
            window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'AI Routing failed: ' + (res.data.error || 'Unknown error'), type: 'error' } }));
          }
        } catch {
          clearInterval(interval);
          setOptimizing(false);
          window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'AI Routing service unreachable. Check backend connection.', type: 'error' } }));
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [currentJobId, optimizing, pollCount]);

  const handleRunAI = async () => {
    if (orders.length === 0) return;
    setOptimizing(true);
    setActiveRoutes([]);
    setPollCount(0);
    try {
      const orderIds = orders.map(o => o.id);
      const response = await api.post('/logistics/routing/optimize-async', { orderIds });
      setCurrentJobId(response.data.jobId);
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'AI Service Error: ' + (err.response?.data?.message || err.message), type: 'error' } }));
      setOptimizing(false);
    }
  };

const visualizeRoutes = (routes: any[]) => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    const formattedRoutes = routes.map((r, idx) => ({
      points: r.route.map((p: any) => [p.lat, p.lng]),
      color: colors[idx % colors.length]
    }));
    setActiveRoutes(formattedRoutes);
  };

  const handleApplyRoute = async () => {
    if (!currentJobId) return;
    try {
      const res = await api.post(`/logistics/routing/jobs/${currentJobId}/apply`);
      if (res.data?.ok || res.data) {
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: `Applied route successfully! Created ${res.data.createdTripsCount || 0} trips.`, type: 'success' } }));
        setAiCompleted(false);
        setJobResult(null);
        fetchDispatchData();
      }
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Apply route failed: ' + (err.response?.data?.message || err.message), type: 'error' } }));
    }
  };

  // --- BƯỚC 3: AI Feedback Submission ---
  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingFeedback(true);
    try {
       // Ask AI for routing suggestion
       await api.post('/logistics/ai/feedback', {
         modelUsed: 'routing-v1',
         tripId: feedbackTarget?.id,
         reason: feedbackForm.reason,
         expectedRoute: feedbackForm.expectedRoute
       });
       window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Feedback submitted. ML Pipeline will retrain the model.', type: 'info' } }));
       setIsFeedbackModalOpen(false);
       setFeedbackForm({ reason: '', expectedRoute: '' });
    } catch (error: any) {
       window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Failed to submit feedback: ' + (error.response?.data?.message || error.message), type: 'error' } }));
    }
  };

  const mapMarkers = orders.map(o => ({
    id: o.id,
    lat: Number(o.lat) || 10.762622,
    lng: Number(o.lng) || 106.660172,
    label: `${o.trackingCode}: ${o.recipientAddress}`
  }));

  // Drag & Drop
  const onDragEnd = async (result: any) => {
    const { source, destination, draggableId } = result;
    if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) {
      return;
    }
    if (source.droppableId === 'drivers-list' && destination.droppableId.startsWith('trip-')) {
      const tripId = destination.droppableId.replace('trip-', '');
      const driver = drivers.find(d => d.id === draggableId);
      const trip = trips.find(t => t.id === tripId);
      if (!driver || !trip) return;

      if (new Date(driver.licenseExpiry) < new Date()) {
         setValidationError('Cannot assign driver with expired license.');
         return;
      }
      if (driver.status === 'ON_TRIP') {
         setValidationError('Driver is already ON_TRIP.');
         return;
      }
      if (trip.driverId) {
         setValidationError('This trip already has a driver assigned. Unassign them first.');
         return;
      }

      setTrips(prev => prev.map(t => t.id === tripId ? { ...t, driverId: driver.id, driverName: driver.name } : t));
      setDrivers(prev => prev.filter(d => d.id !== driver.id));
      try {
        await api.post(`/trips/${tripId}/assign`, { driverId: driver.id });
      } catch (err) {
        fetchDispatchData(); // revert
      }
    }
  };

  const isLicenseExpired = (dateString: string) => new Date(dateString) < new Date();

  if (!isBrowser) return null;

return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="p-8 max-w-[1600px] mx-auto animate-fade-in flex flex-col h-[calc(100vh-64px)]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10 shrink-0">
          <div>
            <h1 className="text-4xl font-bold text-ink tracking-tight flex items-center gap-3">
              Dispatch Tower
              {optimizing && <Badge variant="warning" className="animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.5)]">AI CLUSTER COMPUTING...</Badge>}
            </h1>
            <p className="text-sm text-inkSoft mt-2 font-medium">Drag-and-drop driver assignment and AI VRP Route optimization.</p>
          </div>
          <div className="flex gap-3">
             <Button variant="outline" size="md" className="font-bold tracking-widest text-[10px]" onClick={() => setActiveRoutes([])}>
               CLEAR MAP
             </Button>
             {aiCompleted && (
               <Button 
                 variant="success" 
                 size="md" 
                 onClick={handleApplyRoute}
                 className="gap-2 shadow-lg shadow-emerald-500/20 font-bold tracking-widest text-[10px]"
               >
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7"/></svg>
                 APPLY ROUTE
               </Button>
             )}
             <Button 
               variant="primary" 
               size="md" 
               onClick={handleRunAI} 
               isLoading={optimizing} 
               disabled={orders.length === 0 || optimizing || aiCompleted} 
               className="gap-2 shadow-lg shadow-primary/20 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border-none"
             >
               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
               {optimizing ? 'AI IS SOLVING VRP...' : `AUTO-ROUTING (AI) - ${orders.length} PKG`}
             </Button>
           </div>
        </div>

        <div className="flex gap-8 flex-1 min-h-0 overflow-hidden">
          {/* Left: Queue Column */}
          <Card className="w-80 flex flex-col shrink-0 bg-white border-white/60 shadow-lg">
            <div className="flex border-b border-slate-100">
              <button onClick={() => setActiveTab('drivers')} className={`flex-1 py-4 text-xs font-bold tracking-widest uppercase transition-colors ${activeTab === 'drivers' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-slate-400 hover:bg-slate-50'}`}>
                Drivers
              </button>
              <button onClick={() => setActiveTab('orders')} className={`flex-1 py-4 text-xs font-bold tracking-widest uppercase transition-colors ${activeTab === 'orders' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-slate-400 hover:bg-slate-50'}`}>
                Orders
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
              {activeTab === 'orders' ? (
                <div className="space-y-3">
                  {loading ? (
                    <div className="py-10 text-center text-xs font-bold text-slate-400 animate-pulse">SYNCING ORDERS...</div>
                  ) : orders.length === 0 ? (
                    <div className="py-10 text-center text-xs font-bold text-slate-400">NO PENDING ORDERS</div>
                  ) : orders.map((o: any) => (
                    <div key={o.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-ink font-mono tracking-tight">{o.trackingCode}</span>
                        <Badge variant="neutral" className="text-[8px] py-0">{Number(o.codAmount).toLocaleString()}đ</Badge>
                      </div>
                      <p className="text-[11px] text-inkSoft font-medium line-clamp-1">{o.recipientAddress}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <Droppable droppableId="drivers-list" isDropDisabled={true}>
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3 min-h-[200px]">
                      {drivers.map((d, index) => {
                        const isExpired = isLicenseExpired(d.licenseExpiry);
                        const isBusy = d.status === 'ON_TRIP';
                        const isDraggable = !isExpired && !isBusy;

                        return (
                          <Draggable key={d.id} draggableId={d.id} index={index} isDragDisabled={!isDraggable}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`p-4 rounded-xl border transition-all ${
                                  snapshot.isDragging ? 'shadow-xl scale-105 rotate-2 bg-white border-primary z-50' 
                                  : isExpired ? 'bg-red-50/50 border-red-100 opacity-75' 
                                  : isBusy ? 'bg-slate-100 border-slate-200 opacity-60'
                                  : 'bg-white border-slate-200 hover:border-primary/40 shadow-sm cursor-grab'
                                }`}
                              >
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-sm font-bold text-ink">{d.name}</span>
                                  {isExpired ? <Badge variant="error" className="text-[8px]">EXPIRED</Badge>
                                  : isBusy ? <Badge variant="neutral" className="text-[8px]">ON TRIP</Badge>
                                  : <Badge variant="success" className="text-[8px]">READY</Badge>}
                                </div>
                                <div className={`text-[10px] font-mono font-bold ${isExpired ? 'text-red-500' : 'text-slate-400'}`}>
                                  License exp: {new Date(d.licenseExpiry).toLocaleDateString()}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              )}
            </div>
          </Card>

          {/* Center: Live Map Visualization */}
          <Card className="flex-1 relative overflow-hidden border-white/20 shadow-2xl">
            <LeafletMap 
              center={[10.762622, 106.660172]} 
              zoom={13} 
              markers={[...mapMarkers, ...fleetLocations]} 
              polylines={activeRoutes} 
            />
            <div className="absolute top-6 left-6 flex gap-2 z-[1000]">
               <Badge variant="success" className="shadow-lg">MAP: LEAFLET ONLINE</Badge>
            </div>
            {optimizing && (
               <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[2px] z-[999] flex items-center justify-center">
                  <div className="bg-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in zoom-in-95">
                     <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                     <span className="font-bold text-ink tracking-widest text-sm uppercase">Calculating Optimal Vectors...</span>
                  </div>
               </div>
            )}
          </Card>

          {/* Right: Active Trips */}
          <Card className="w-80 flex flex-col shrink-0 bg-white border-white/60 shadow-lg">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-sm font-bold text-ink uppercase tracking-widest">Active Trips</h3>
              <Badge variant="info">{trips.length}</Badge>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
               {trips.map(trip => (
                 <Droppable key={trip.id} droppableId={`trip-${trip.id}`}>
                   {(provided, snapshot) => (
                     <div 
                       ref={provided.innerRef} 
                       {...provided.droppableProps}
                       className={`p-4 rounded-2xl border-2 transition-all ${
                         snapshot.isDraggingOver ? 'bg-primary/5 border-primary border-dashed shadow-inner' 
                         : trip.isAiGenerated ? 'bg-indigo-50/30 border-indigo-200 shadow-sm'
                         : 'bg-white border-slate-100 shadow-sm hover:border-slate-300'
                       }`}
                     >
                        <div className="flex justify-between items-start mb-3">
                           <div>
                             <span className="text-xs font-extrabold text-ink font-mono block">{trip.tripCode}</span>
                             {trip.isAiGenerated && <span className="text-[9px] font-bold text-indigo-500 tracking-widest uppercase flex items-center gap-1 mt-0.5"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> AI OPTIMIZED</span>}
                           </div>
                           <Badge variant="neutral" className="text-[9px] py-0">{trip.ordersCount} ORDERS</Badge>
                        </div>
                        
                        <div className="mb-4 text-[11px] font-bold text-slate-500 flex items-center gap-2">
                           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
                           Vehicle: <span className="text-ink">{trip.vehicle}</span>
                        </div>
                        
                        <div className={`p-3 rounded-xl border mb-3 ${trip.driverId ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-200 border-dashed flex flex-col items-center justify-center py-6'}`}>
                           {trip.driverId ? (
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7"/></svg>
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Assigned Driver</p>
                                  <p className="text-sm font-bold text-ink">{trip.driverName}</p>
                                </div>
                             </div>
                           ) : (
                             <>
                               <svg className="w-6 h-6 text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Drop Driver Here</span>
                             </>
                           )}
                        </div>

                        {/* AI Feedback Button for AI generated trips */}
                        {trip.isAiGenerated && (
                          <button 
                            onClick={() => { setFeedbackTarget(trip); setIsFeedbackModalOpen(true); }}
                            className="w-full py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-[10px] font-bold text-rose-600 uppercase tracking-widest hover:bg-rose-100 transition-colors"
                          >
                            Báo Cáo AI Sai (Feedback)
                          </button>
                        )}
                        
                        {provided.placeholder}
                     </div>
                   )}
                 </Droppable>
               ))}
            </div>
          </Card>
        </div>
      </div>

      {/* BƯỚC 3: AI Feedback Modal Form */}
      {isFeedbackModalOpen && feedbackTarget && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
           <Card className="w-full max-w-md bg-white border-white/40 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-8 border-b border-rose-100 bg-rose-50/50">
                <h2 className="text-2xl font-bold text-rose-900 tracking-tight flex items-center gap-2">
                   <svg className="w-6 h-6 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                   Report AI Routing Error
                </h2>
                <p className="text-sm text-rose-900/60 mt-1 font-medium">Help us train the ML model for {feedbackTarget.tripCode}</p>
              </div>

              <form onSubmit={handleFeedbackSubmit} className="p-8 space-y-5">
                 <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Why is this route suboptimal?</label>
                    <textarea 
                     required
                     value={feedbackForm.reason}
                     onChange={e => setFeedbackForm({...feedbackForm, reason: e.target.value})}
                     className="w-full bg-white/50 border border-slate-200 text-ink text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all h-24 resize-none"
                     placeholder="e.g. AI directed truck through a road with weight limit..."
                    ></textarea>
                 </div>
                 
                 <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Expected / Better Route</label>
                    <textarea 
                     required
                     value={feedbackForm.expectedRoute}
                     onChange={e => setFeedbackForm({...feedbackForm, expectedRoute: e.target.value})}
                     className="w-full bg-white/50 border border-slate-200 text-ink text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all h-20 resize-none"
                     placeholder="e.g. Should have grouped with Trip A2 instead."
                    ></textarea>
                 </div>

                 <div className="mt-8 flex gap-4">
                    <Button type="button" variant="ghost" onClick={() => setIsFeedbackModalOpen(false)} disabled={submittingFeedback} className="flex-1 font-bold uppercase tracking-widest text-[10px]">
                      Cancel
                    </Button>
                    <Button type="submit" isLoading={submittingFeedback} disabled={submittingFeedback} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold uppercase tracking-widest text-[10px]">
                      {submittingFeedback ? 'SUBMITTING...' : 'SUBMIT FEEDBACK'}
                    </Button>
                 </div>
              </form>
           </Card>
        </div>
      )}

      {/* Validation Error Modal */}
      {validationError && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-8 text-center border-t-4 border-t-rose-500">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            </div>
            <h2 className="text-xl font-bold text-ink mb-2">Assignment Failed</h2>
            <p className="text-slate-500 text-sm mb-6">{validationError}</p>
            <Button variant="primary" className="bg-rose-600 hover:bg-rose-700 w-full" onClick={() => setValidationError(null)}>Close</Button>
          </div>
        </div>
      )}
    </DragDropContext>
  );
}

