"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui-new/Card';
import { Badge } from '@/components/ui-new/Badge';

export default function CustomerPortalHome() {
  const [trackingCode, setTrackingCode] = useState('');
  const router = useRouter();

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingCode.trim()) {
      router.push(`/track/${trackingCode.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Aesthetic */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

      <div className="max-w-4xl w-full z-10 animate-fade-in">
        <div className="text-center mb-16">
          <Badge variant="info" className="mb-4 px-3 py-1">Public Tracking Portal</Badge>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white mb-6 leading-[0.9]">
            Follow every <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
              Movement.
            </span>
          </h1>
          <p className="text-zinc-400 text-lg md:text-xl font-medium max-w-xl mx-auto leading-relaxed">
            Enter your tracking identifier below for real-time visibility and autonomous ETA updates.
          </p>
        </div>

        <Card className="p-2 md:p-3 rounded-[2.5rem] bg-white/5 border-white/10 backdrop-blur-3xl shadow-2xl max-w-2xl mx-auto mb-20 animate-slide-up">
           <form onSubmit={handleTrack} className="flex flex-col md:flex-row items-center gap-2">
              <div className="flex-1 relative w-full">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-500">
                   <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <input 
                  type="text" 
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  placeholder="TRK-2026-XXXXX"
                  className="w-full bg-transparent border-none outline-none py-5 pl-16 pr-6 text-xl text-white placeholder:text-zinc-600 font-bold tracking-tight"
                  required
                />
              </div>
              <button 
                type="submit"
                className="w-full md:w-auto bg-primary hover:bg-primary-600 text-white px-10 py-5 rounded-[1.8rem] font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-lg shadow-primary/20"
              >
                Locate Package
              </button>
           </form>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-slide-up" style={{ animationDelay: '200ms' }}>
           <FeatureCard 
             icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
             title="Live GPS"
             desc="Monitor driver transit on high-fidelity regional maps."
             color="blue"
           />
           <FeatureCard 
             icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
             title="Secure POD"
             desc="Access digital signatures and photographic evidence."
             color="emerald"
           />
           <FeatureCard 
             icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
             title="AI ETA"
             desc="Predictive arrival intelligence powered by OR-Tools."
             color="primary"
           />
        </div>
      </div>

      <div className="absolute bottom-8 text-center w-full">
         <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.4em]">Powered by SmartLogi Systems</p>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc, color }: any) {
  const colorMap: any = {
    blue: 'text-blue-400 bg-blue-500/10',
    emerald: 'text-emerald-400 bg-emerald-500/10',
    primary: 'text-primary bg-primary/10'
  };
  
  return (
    <Card className="p-8 group hover:border-white/20 transition-all duration-500">
       <div className={`w-12 h-12 rounded-2xl ${colorMap[color]} flex items-center justify-center mb-6 border border-white/5`}>
          {icon}
       </div>
       <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
       <p className="text-sm text-zinc-500 font-medium leading-relaxed">{desc}</p>
    </Card>
  );
}
