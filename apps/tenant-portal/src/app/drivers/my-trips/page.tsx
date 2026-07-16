'use client';
import { useAuth } from '@/lib/auth-context';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function MyTripsPage() {
  const { user, token } = useAuth();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);

  useEffect(() => {
    if (token) {
      api.get('/logistics/trips?page=1&limit=50')
         .then(res => setTrips(Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : [])))
         .finally(() => setLoading(false));
    }
  }, [token]);
  
  return (
    <div className="p-8 max-w-5xl mx-auto animate-fade-in">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-ink tracking-tight">
          My Trips
        </h1>
        <p className="text-sm text-inkSoft mt-2 font-medium">View and manage your assigned delivery routes.</p>
      </div>

      <Card className="p-6">
        {loading ? (
           <div className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Loading trips...</div>
        ) : trips.length === 0 ? (
          <EmptyState 
            title="No Active Trips" 
            description="You do not have any trips assigned to you at the moment. Please wait for dispatch to assign a route."
            icon={<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>}
          />
        ) : (
          <div className="space-y-4">
             {trips.map(trip => (
                <div key={trip.id} className="border border-slate-100 rounded-xl p-5 hover:border-slate-300 transition-all">
                   <div className="flex justify-between items-start">
                     <div>
                       <div className="font-bold text-lg text-ink">{trip.tripNumber || trip.id.split('-')[0]}</div>
                       <div className="text-sm text-slate-500 mt-1">Vehicle: {trip.vehicleId || 'Unassigned'}</div>
                     </div>
                     <Badge variant="neutral">{trip.status}</Badge>
                   </div>
                   <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                     <Button size="sm" onClick={() => {
                       setSelectedTrip(trip);
                       setMapModalOpen(true);
                     }}>View Route</Button>
                   </div>
                </div>
             ))}
          </div>
        )}
      </Card>

      {mapModalOpen && selectedTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col h-[80vh]">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-xl font-bold text-ink tracking-tight">Turn-by-turn Navigation</h2>
                <p className="text-sm text-inkSoft">Trip: {selectedTrip.tripNumber || selectedTrip.id.split('-')[0]}</p>
              </div>
              <button onClick={() => setMapModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            
            <div className="flex-1 bg-slate-100 relative">
               <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)", backgroundSize: "20px 20px" }}></div>
               
               <div className="absolute inset-x-4 bottom-4 bg-white rounded-2xl shadow-lg p-6 animate-slide-up">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                       <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                    </div>
                    <div>
                      <p className="font-bold text-ink">Map Integration Coming Soon</p>
                      <p className="text-sm text-slate-500">Live GPS tracking and route optimization will be displayed here.</p>
                    </div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

