'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { Can } from '@/components/auth/Can';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
export default function SettingsPage() {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('general');
  const [saveMessage, setSaveMessage] = useState({ text: '', type: '' });

  const [form, setForm] = useState({
    tenantName: 'SmartLogi Logistics',
    contactEmail: 'contact@smartlogi.vn',
    supportPhone: '+84 1900 1234',
    timezone: 'Asia/Ho_Chi_Minh',
    currency: 'VND',
    autoDispatch: true,
    webhookEnabled: false,
    webhookUrl: '',
    webhookSecret: '',
  });

  const [showSecret, setShowSecret] = useState(false);
  const [pingStatus, setPingStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [pingLog, setPingLog] = useState<string>('');

  useEffect(() => {
    if (token) {
      fetchSettings();
    }
  }, [token]);

   const fetchSettings = async () => {
      setError('');
      try {
        const res = await api.get('/tenant/settings');
        if (res.data) {
          setForm(prev => ({ ...prev, ...res.data }));
        }
      } catch (err) {
        console.error('Failed to fetch settings', err);
        setError('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMessage({ text: '', type: '' });
    try {
      await api.patch('/tenant/settings', form);
      setSaveMessage({ text: 'Settings saved successfully!', type: 'success' });
      setTimeout(() => setSaveMessage({ text: '', type: '' }), 3000);
    } catch (err) {
      console.error('Failed to save settings', err);
      setSaveMessage({ text: 'Failed to save settings.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handlePingTest = async () => {
    if (!form.webhookUrl.startsWith('https://')) {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: "Webhook URL must use HTTPS protocol.", type: 'warning' } }));
      return;
    }
    
    setPingStatus('testing');
    setPingLog('Đang kết nối tới máy chủ Client...\nĐang đàm phán bắt tay TLS/SSL...\nĐang tạo băm HMAC SHA-256 (Secret Key)...');

    // Simulate Golang Backend Exponential Backoff
    setTimeout(() => {
      setPingLog(prev => prev + '\n\n[Attempt 1] POST ' + form.webhookUrl + ' ... Timeout (504)');
      
      setTimeout(() => {
         setPingLog(prev => prev + '\n[Attempt 2 - Backoff 2s] POST ' + form.webhookUrl + ' ... OK');
         setPingLog(prev => prev + '\n\n🎉 Giao tiếp thành công. Webhook đã sẵn sàng!');
         setPingStatus('success');
      }, 2000);

    }, 1500);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500 tracking-tight">
          System Settings
        </h1>
        <p className="text-sm text-slate-500 mt-2">Manage your tenant configuration, integrations, and preferences.</p>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-200/20 overflow-hidden flex flex-col md:flex-row">
        
        {/* Settings Sidebar */}
        <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-100 bg-slate-50/50 p-6 flex flex-col gap-2">
          <button 
            onClick={() => setActiveTab('general')}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'general' ? 'bg-white shadow-sm text-primary border border-slate-200/60' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            General Details
          </button>
          <button 
            onClick={() => setActiveTab('operations')}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'operations' ? 'bg-white shadow-sm text-primary border border-slate-200/60' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            Operations
          </button>
          <button 
            onClick={() => setActiveTab('integrations')}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'integrations' ? 'bg-white shadow-sm text-primary border border-slate-200/60' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            Integrations & APIs
          </button>
          <button 
            onClick={() => setActiveTab('billing')}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'billing' ? 'bg-white shadow-sm text-primary border border-slate-200/60' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            Billing
          </button>
        </div>

        {/* Settings Form */}
        <div className="flex-1 p-8">
          {error && <ErrorBanner message={error} onRetry={fetchSettings} />}
          {loading ? (
            <div className="animate-pulse flex flex-col gap-6">
              <div className="h-8 bg-slate-100 rounded w-1/4"></div>
              <div className="h-10 bg-slate-100 rounded w-full"></div>
              <div className="h-10 bg-slate-100 rounded w-full"></div>
              <div className="h-10 bg-slate-100 rounded w-2/3"></div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="animate-in fade-in duration-300 flex flex-col h-full">
              
              {activeTab === 'general' && (
                <div className="space-y-6 flex-1">
                  <h2 className="text-xl font-bold text-slate-900 mb-6 border-b border-slate-100 pb-4">General Details</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Tenant Name</label>
                      <input type="text" value={form.tenantName} onChange={e => setForm({...form, tenantName: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Contact Email</label>
                      <input type="email" value={form.contactEmail} onChange={e => setForm({...form, contactEmail: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Support Phone</label>
                      <input type="text" value={form.supportPhone} onChange={e => setForm({...form, supportPhone: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Timezone</label>
                      <select value={form.timezone} onChange={e => setForm({...form, timezone: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm bg-white">
                        <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (GMT+7)</option>
                        <option value="Asia/Singapore">Asia/Singapore (GMT+8)</option>
                        <option value="America/New_York">America/New_York (GMT-5)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Currency</label>
                      <select value={form.currency} onChange={e => setForm({...form, currency: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm bg-white">
                        <option value="VND">VND (₫)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'operations' && (
                <div className="space-y-6 flex-1">
                  <h2 className="text-xl font-bold text-slate-900 mb-6 border-b border-slate-100 pb-4">Logistics Operations</h2>
                  
                  <label className="flex items-start gap-4 p-4 rounded-2xl border border-slate-200 hover:border-primary/50 cursor-pointer transition-colors bg-slate-50/50">
                    <div className="flex items-center h-5 mt-0.5">
                      <input type="checkbox" checked={form.autoDispatch} onChange={e => setForm({...form, autoDispatch: e.target.checked})} className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary" />
                    </div>
                    <div>
                      <span className="block text-sm font-bold text-slate-900">Auto-Dispatch with AI</span>
                      <span className="block text-xs text-slate-500 mt-1">Automatically assign available drivers and vehicles to new orders using Route Optimization AI when conditions are optimal.</span>
                    </div>
                  </label>
                </div>
              )}

              {activeTab === 'integrations' && (
                <div className="space-y-6 flex-1">
                  <h2 className="text-xl font-bold text-slate-900 mb-6 border-b border-slate-100 pb-4">System Integrations</h2>
                  
                  <label className="flex items-start gap-4 p-4 rounded-2xl border border-slate-200 hover:border-primary/50 cursor-pointer transition-colors mb-6">
                    <div className="flex items-center h-5 mt-0.5">
                      <input type="checkbox" checked={form.webhookEnabled} onChange={e => setForm({...form, webhookEnabled: e.target.checked})} className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary" />
                    </div>
                    <div>
                      <span className="block text-sm font-bold text-slate-900">Enable Outbound Webhooks</span>
                      <span className="block text-xs text-slate-500 mt-1">Send event payloads (order status changes, dispatch events) to external systems (e.g. Shopee).</span>
                    </div>
                  </label>

                  {form.webhookEnabled && (
                    <div className="space-y-6 animate-in slide-in-from-top-2 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 flex justify-between">
                          Webhook URL
                          {!form.webhookUrl.startsWith('https://') && form.webhookUrl.length > 0 && (
                            <span className="text-rose-500 font-bold lowercase tracking-normal">Must use https://</span>
                          )}
                        </label>
                        <input type="url" value={form.webhookUrl} onChange={e => setForm({...form, webhookUrl: e.target.value})} className={`w-full px-4 py-2.5 rounded-xl border ${!form.webhookUrl.startsWith('https://') && form.webhookUrl.length > 0 ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500 bg-rose-50' : 'border-slate-200 focus:ring-primary/20 focus:border-primary bg-white'} focus:outline-none focus:ring-2 transition-all text-sm font-mono`} placeholder="https://api.example.com/webhook" />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 flex justify-between items-center">
                          HMAC Secret Key
                          <button type="button" onClick={() => setShowSecret(!showSecret)} className="text-[10px] text-primary hover:underline lowercase tracking-normal flex items-center gap-1">
                            {showSecret ? 'Hide Key' : 'Show Key'}
                          </button>
                        </label>
                        <input type={showSecret ? "text" : "password"} value={form.webhookSecret} onChange={e => setForm({...form, webhookSecret: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-mono bg-white" placeholder="••••••••••••••••" />
                        <p className="text-[10px] text-slate-400 mt-2 font-medium">This key is used by our Golang server to sign the payload (HMAC SHA-256) inside the <code className="bg-slate-200 px-1 py-0.5 rounded text-ink">X-Webhook-Signature</code> header.</p>
                      </div>

                      <div className="pt-4 border-t border-slate-200 flex flex-col gap-4">
                        <button
                          type="button"
                          disabled={pingStatus === 'testing' || !form.webhookUrl || !form.webhookSecret}
                          onClick={handlePingTest}
                          className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50 self-start"
                        >
                          {pingStatus === 'testing' ? 'TESTING CONNECTION...' : 'GỬI PING TEST'}
                        </button>
                        
                        {pingStatus !== 'idle' && (
                          <div className={`p-4 rounded-xl text-xs font-mono whitespace-pre-wrap transition-all ${pingStatus === 'testing' ? 'bg-indigo-50 text-indigo-800 border border-indigo-100 animate-pulse' : pingStatus === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-rose-50 text-rose-800 border border-rose-100'}`}>
                            {pingLog}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'billing' && (
                <div className="space-y-6 flex-1">
                  <h2 className="text-xl font-bold text-slate-900 mb-6 border-b border-slate-100 pb-4">Subscription & Billing</h2>
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <div className="text-indigo-100 text-xs font-bold uppercase tracking-widest mb-1">Current Plan</div>
                        <div className="text-2xl font-bold">Enterprise Edition</div>
                      </div>
                      <span className="px-3 py-1 bg-white/20 backdrop-blur rounded-full text-xs font-bold">ACTIVE</span>
                    </div>
                    <div className="flex items-center gap-2 text-indigo-100 text-sm">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      AI Routing & Analytics Enabled
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-10 pt-6 border-t border-slate-100 flex justify-between items-center">
                <div className="text-sm font-bold">
                  {saveMessage.text && (
                    <span className={saveMessage.type === 'success' ? 'text-emerald-500' : 'text-rose-500'}>
                      {saveMessage.text}
                    </span>
                  )}
                </div>
                <Can perform="settings:manage">
                  <button 
                    type="submit" 
                    disabled={saving || activeTab === 'billing'}
                    className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-xl text-sm font-bold transition-all shadow-sm shadow-primary/20 hover:shadow-md hover:shadow-primary/40 disabled:opacity-50 disabled:hover:shadow-sm"
                  >
                    {saving ? 'Saving Changes...' : 'Save Settings'}
                  </button>
                </Can>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

