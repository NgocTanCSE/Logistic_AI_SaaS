'use client';

import { useState } from 'react';
import api from '@/lib/api';

export function AIOptimizeButton() {
  const [isScanning, setIsScanning] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleRunAI = async () => {
    if (isScanning || isSuccess) return;
    
    setIsScanning(true);
    
    try {
      const token = localStorage.getItem('tenant_token');
      // API call to AI optimization service
      await api.post('/logistics/routing/optimize-async', {
        warehouseId: 'WH-Main',
        date: new Date().toISOString().split('T')[0],
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error('AI Optimize failed', err);
      alert('AI Optimization Service is currently unreachable.');
      throw err;
    } finally {
      setIsScanning(false);
      setIsSuccess(true);
      
      // Reset after showing success state
      setTimeout(() => {
        setIsSuccess(false);
      }, 3000);
    }
  };

  return (
    <button
      onClick={handleRunAI}
      disabled={isScanning || isSuccess}
      className={`relative overflow-hidden flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
        isSuccess 
          ? 'bg-moss/20 text-moss border border-moss/50 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
          : isScanning
          ? 'bg-accent/20 text-accent border border-accent/50 shadow-[0_0_20px_rgba(16,185,129,0.4)] cursor-wait'
          : 'bg-accent hover:bg-accent/90 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.6)] hover:-translate-y-0.5 border border-accent'
      }`}
    >
      {/* Scanning Laser Effect */}
      {isScanning && (
        <>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[scan_1.5s_ease-in-out_infinite]"></div>
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-accent shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
        </>
      )}

      {/* Content */}
      <span className="relative z-10 flex items-center gap-2">
        {isSuccess ? (
          <>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
            </svg>
            Optimized Successfully
          </>
        ) : isScanning ? (
          <>
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Analyzing Routes...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Run SmartLogi SAI
          </>
        )}
      </span>

      {/* Global Style for scan animation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { transform: translateX(-100%) skewX(-15deg); }
          100% { transform: translateX(200%) skewX(-15deg); }
        }
      `}} />
    </button>
  );
}
