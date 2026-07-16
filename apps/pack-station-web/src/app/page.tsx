'use client';

import { useState, useRef, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import '@tensorflow/tfjs-backend-wasm';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useSerialPort } from '@/hooks/useSerialPort';

const decodeJwt = (token: string): any => {
  try {
    const payload = token.split('.')[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(normalized));
  } catch { return null; }
};

const ALLOWED_ROLES = ['WAREHOUSE_STAFF', 'WAREHOUSE_MANAGER', 'TENANT_ADMIN', 'SUPER_ADMIN'];

export default function PackStationPage() {
  const router = useRouter();
  
  // AI State
  const [model, setModel] = useState<any>(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [prediction, setPrediction] = useState<any>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [isAutoLearning, setIsAutoLearning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Sync Tasks State
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  
  // Terminal Logs State
  const [logs, setLogs] = useState<{time: string, msg: string, type: 'info'|'success'|'error'}[]>([]);

  // Serial Port (Barcode Scanner)
  const { isConnected: serialConnected, data: serialData, error: serialError, connect: connectSerial } = useSerialPort();

  useEffect(() => {
    // Check Auth
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('smartlogi_pack_token');
      if (!token) {
        router.push('/login');
        return;
      }
      const payload = decodeJwt(token);
      const userRole = payload?.role || '';
      if (!ALLOWED_ROLES.includes(userRole)) {
        localStorage.removeItem('smartlogi_pack_token');
        router.push('/login');
        return;
      }
    }
    
    // Load AI
    async function loadAI() {
      try { await tf.setBackend('wasm'); } catch { /* wasm not available, use default */ }
      await tf.ready();
      const loadedModel = await mobilenet.load();
      setModel(loadedModel);
      setIsModelLoading(false);
      startVideo();
    }
    loadAI();
    
    // Load Tasks
    fetchTasks();
  }, [router]);

  const addLog = (msg: string, type: 'info'|'success'|'error' = 'info') => {
    setLogs(prev => [{ time: new Date().toLocaleTimeString(), msg, type }, ...prev].slice(0, 10));
  };

  const startVideo = () => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => { if (videoRef.current) videoRef.current.srcObject = stream; })
        .catch(err => {
          addLog('Camera access denied or unavailable', 'error');
        });
    }
  };

  const identifyProduct = async () => {
    if (model && videoRef.current && videoRef.current.readyState === 4) {
      const predictions = await model.classify(videoRef.current);
      if (predictions.length > 0) {
        setPrediction(predictions[0].className);
        setConfidence(predictions[0].probability * 100);
      }
    }
  };

  useEffect(() => {
    const interval = setInterval(identifyProduct, 1000);
    return () => clearInterval(interval);
  }, [model]);

  // Handle barcode scanner input via serial port
  useEffect(() => {
    if (serialData && serialData.length > 0) {
      const cleaned = serialData.replace(/[\r\n]/g, '').trim();
      if (cleaned.length > 3) {
        setPrediction(cleaned);
        setConfidence(100);
        addLog(`Scanner: ${cleaned}`, 'info');
      }
    }
  }, [serialData]);

  useEffect(() => {
    if (serialError) {
      addLog(`Serial error: ${serialError}`, 'error');
    }
  }, [serialError]);

  const fetchTasks = async () => {
    setSyncing(true);
    addLog('Syncing tasks from server...', 'info');
    try {
      const res = await api.get('/mobile/sync');
      setTasks(res.data || []);
      addLog(`Synced ${res.data?.length || 0} tasks`, 'success');
      if (res.data?.length > 0 && !selectedTaskId) {
        setSelectedTaskId(res.data[0].id);
      }
    } catch (err: any) {
      console.error(err);
      addLog('Failed to sync tasks. ' + (err.response?.data?.message || err.message), 'error');
      setTasks([]);
      setSelectedTaskId(null);
    } finally {
      setSyncing(false);
      setInitialLoaded(true);
    }
  };

  // 🔥 PHASE 6: Gửi Feedback AI + Sync Scan Log (Optimistic Locking)
  const handleManualConfirm = async () => {
    if (!selectedTaskId) {
      alert("Vui lòng chọn một Task để đóng gói!");
      return;
    }
    
    setIsAutoLearning(true);
    try {
      const humanCorrectedName = prompt("Xác nhận mã sản phẩm/barcode:", prediction || "ITEM-001");
      if (!humanCorrectedName) return;
      
      // 1. Gửi AI feedback (Silently)
      api.post('/ai/v1/feedback', {
        model_id: "mobilenet-v2-edge",
        resource_type: "PRODUCT",
        resource_id: humanCorrectedName,
        ai_prediction: { className: prediction, confidence },
        human_corrected: { className: humanCorrectedName },
        confidence: confidence / 100
      }).catch(e => console.warn("AI service not ready", e));

      // 2. Gửi scan log tới Inventory Service
      addLog(`Posting scan log for ${humanCorrectedName}...`, 'info');
      await api.post('/mobile/scan-logs', {
        logs: [
          {
            warehouseId: 'WH-Main',
            taskId: selectedTaskId,
            barcode: humanCorrectedName,
            result: 'PACK',
            deviceId: 'STATION-01'
          }
        ]
      });

      addLog(`Successfully packed ${humanCorrectedName}! Inventory deducted.`, 'success');
      
      // Remove task locally or re-sync
      setTasks(prev => prev.filter(t => t.id !== selectedTaskId));
      setSelectedTaskId(null);
      
    } catch (e: any) {
      console.error(e);
      const errMsg = e.response?.data?.message || e.message;
      addLog(`Pack Error: ${errMsg}`, 'error');
      alert(`❌ Lỗi: ${errMsg}`);
    } finally {
      setIsAutoLearning(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 flex flex-col">
      <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-6">
        <div>
          <h1 className="text-3xl font-black text-blue-500 italic">PACK STATION CORE</h1>
          <p className="text-gray-400 mt-1 italic font-mono text-sm">Station ID: WH-01-STATION-01</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={fetchTasks}
            disabled={syncing}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg font-mono text-xs border border-white/10 transition-colors flex items-center gap-2"
          >
            {syncing ? ' SYNCING...' : ' SYNC TASKS'}
          </button>
          <button
            onClick={connectSerial}
            className={`px-4 py-2 rounded-lg font-mono text-xs border transition-colors ${serialConnected ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-white/10'}`}
          >
            {serialConnected ? ' SCANNER OK' : ' CONNECT SCANNER'}
          </button>
          {isAutoLearning && <span className="text-blue-500 animate-pulse font-bold text-xs mt-2">🧬 PROCESSING...</span>}
          <div className={`px-4 py-2 mt-1 rounded-full font-bold text-xs h-fit ${isModelLoading ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
            {isModelLoading ? '⏳ AI LOADING...' : '🟢 CAMERA READY'}
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column: Task Queue */}
        <div className="col-span-1 flex flex-col gap-4">
          <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl p-4 flex-1 overflow-hidden flex flex-col">
            <h3 className="font-bold text-slate-300 mb-4 flex items-center justify-between">
              TASK QUEUE 
              <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-xs">{tasks.length}</span>
            </h3>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {tasks.length === 0 ? (
                <div className="text-center text-slate-500 py-8 text-sm font-mono">
                  {initialLoaded ? 'No pending tasks.' : 'Loading tasks...'}
                </div>
              ) : (
                tasks.map(t => (
                  <div 
                    key={t.id}
                    onClick={() => setSelectedTaskId(t.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-colors ${selectedTaskId === t.id ? 'bg-blue-500/20 border-blue-500/50' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
                  >
                    <div className="text-xs text-slate-400 font-mono mb-1">{t.id}</div>
                    <div className="font-bold text-sm truncate">{t.product?.name || 'Unknown Item'}</div>
                    <div className="text-xs text-blue-400 mt-2 font-mono">REQ: 1 UNIT</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Middle Column: Camera & Inference */}
        <div className="col-span-1 lg:col-span-2 flex flex-col gap-6">
          <div className="relative bg-[#1e1e1e] rounded-3xl overflow-hidden border-2 border-blue-500/30 shadow-[0_0_50px_rgba(59,130,246,0.15)] flex-1 min-h-[400px]">
             <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover absolute inset-0" />
             
             {/* Scanner overlay */}
             <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-64 h-64 border-2 border-dashed border-blue-500/50 rounded-2xl"></div>
             </div>

             <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-6">
                <div className="flex justify-between items-end">
                   <div>
                     <p className="text-blue-400 font-mono text-xs mb-1">AI INFERENCE RESULT</p>
                     <h2 className="text-3xl font-black tracking-tighter truncate max-w-md">{prediction?.toUpperCase() || 'WAITING...'}</h2>
                   </div>
                   <div className="text-right">
                     <p className="text-slate-400 font-mono text-xs mb-1">CONFIDENCE</p>
                     <span className={`text-2xl font-mono font-black ${confidence > 90 ? 'text-emerald-400' : 'text-amber-400'}`}>{confidence.toFixed(1)}%</span>
                   </div>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <button 
              onClick={() => {
                const manualInput = prompt("Nhập mã sản phẩm / barcode:");
                if (manualInput) {
                  setPrediction(manualInput);
                  setConfidence(100);
                  addLog(`Manual input: ${manualInput}`, 'info');
                }
              }}
              className="bg-white/5 hover:bg-white/10 border border-white/10 py-5 rounded-2xl font-bold transition-all text-sm">
                MANUAL INPUT (KEYBOARD)
             </button>
             <button 
              onClick={handleManualConfirm}
              disabled={isAutoLearning || !selectedTaskId}
              className="bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-2xl font-black tracking-widest shadow-xl shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
             >
                PACK & DEDUCT STOCK
             </button>
          </div>
        </div>

        {/* Right Column: Terminal Logs */}
        <div className="col-span-1 flex flex-col">
          <div className="bg-black border border-slate-800 rounded-2xl p-4 flex-1 font-mono text-xs flex flex-col">
            <h3 className="text-slate-500 mb-4 font-bold border-b border-slate-800 pb-2">STATION TERMINAL</h3>
            <div className="flex-1 overflow-y-auto space-y-2">
              {logs.map((l, i) => (
                <div key={i} className={`flex gap-2 ${l.type === 'error' ? 'text-red-400' : l.type === 'success' ? 'text-emerald-400' : 'text-slate-400'}`}>
                  <span className="text-slate-600 shrink-0">[{l.time}]</span>
                  <span className="break-words">{l.msg}</span>
                </div>
              ))}
              {logs.length === 0 && <div className="text-slate-600">Waiting for activity...</div>}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
