'use client';
import useSWR from 'swr';
import api from '@/lib/api';
import { Card } from '@/components/ui-new/Card';
import { Badge } from '@/components/ui-new/Badge';

const fetcher = async (url: string) => {
  const res = await api.get(url);
  return res.data;
};

export default function TrackPage({ params }: { params: { code: string } }) {
  const { data: order, error, isLoading } = useSWR(`/public/track/${params.code}`, fetcher);
  const { data: verifyData } = useSWR(order ? `/public/verify/${params.code}` : null, fetcher);

  const events = order?.events || [];

  if (isLoading) return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center text-primary">
       <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
       <span className="text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Orbiting Package...</span>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Tracking Not Found</h2>
        <p className="text-sm text-zinc-400">No shipment matches code <span className="font-mono text-primary">{params.code}</span>. Please verify your tracking number.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Aesthetic */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="max-w-xl w-full z-10 animate-fade-in">
        <Card className="overflow-hidden border-white/10 shadow-2xl bg-white/5 backdrop-blur-3xl">
          {/* Hero Header */}
          <div className="p-10 border-b border-white/10 bg-gradient-to-br from-primary/10 to-transparent">
             <div className="flex justify-between items-start mb-10">
                <div className="inline-flex items-center gap-2">
                   <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
                      <div className="w-3 h-3 border-2 border-white rounded-sm rotate-45"></div>
                   </div>
                   <span className="text-sm font-black text-white tracking-widest italic uppercase">SmartLogi</span>
                </div>
                <Badge variant="success">IN TRANSIT</Badge>
             </div>

             <div>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em] mb-2">Tracking Identifier</p>
                <h1 className="text-4xl font-black text-white tracking-tighter font-mono">{params.code}</h1>
             </div>

             <div className="mt-10 grid grid-cols-2 gap-8 border-t border-white/5 pt-8">
                <div>
                  <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Recipient</p>
                  <p className="text-sm font-bold text-white uppercase tracking-tight">{order?.recipientName || 'Verified Customer'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Estimated Arrival</p>
                  <p className="text-sm font-bold text-primary uppercase tracking-tight italic">Today, 4:30 PM</p>
                </div>
             </div>
          </div>

          {/* Timeline */}
          <div className="p-10 bg-zinc-950/20 max-h-[450px] overflow-y-auto custom-scrollbar">
             {events.length === 0 ? (
               <div className="text-center py-12">
                 <div className="w-14 h-14 bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                   <svg className="w-7 h-7 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                   </svg>
                 </div>
                 <p className="text-sm font-bold text-zinc-400">No tracking events yet</p>
                 <p className="text-xs text-zinc-600 mt-1">Shipment information will appear here once available.</p>
               </div>
             ) : (
               <div className="relative border-l border-white/10 ml-4 space-y-10">
                 {events.map((ev: any, idx: number) => (
                   <div key={idx} className="relative pl-10 group">
                     <div className={`absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-zinc-950 ${idx === 0 ? 'bg-primary shadow-[0_0_12px_rgba(15,118,110,0.8)] scale-125' : 'bg-zinc-700'}`}></div>
                     <div className="flex justify-between items-start mb-1.5">
                        <h3 className={`text-xs font-black uppercase tracking-widest ${idx === 0 ? 'text-primary' : 'text-zinc-400'}`}>
                          {ev.status.replace(/_/g, ' ')}
                        </h3>
                        <span className="text-[9px] font-bold text-zinc-600 font-mono">{new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                     </div>
                     <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight mb-2">{ev.location || 'Global Hub'}</p>
                     {ev.description && (
                       <p className="text-sm text-zinc-400 font-medium leading-relaxed bg-white/5 p-4 rounded-2xl border border-white/5">{ev.description}</p>
                     )}
                   </div>
                 ))}
               </div>
             )}
          </div>

          {/* Action Area */}
          <div className="p-8 border-t border-white/10 bg-zinc-950/40 text-center">
             <Button className="w-full bg-white/10 hover:bg-white/20 border border-white/10 text-white font-black uppercase text-[10px] py-4 tracking-[0.2em] rounded-2xl transition-all">
                Download Full Manifest (PDF)
             </Button>
          </div>
        </Card>

        <p className="mt-10 text-center text-[10px] font-bold text-zinc-700 uppercase tracking-[0.5em]">Logistics Intelligence v4.0</p>
      </div>
    </div>
  );
}

function Button({ children, className, ...props }: any) {
  return (
    <button 
      className={`inline-flex items-center justify-center transition-all active:scale-[0.98] ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
