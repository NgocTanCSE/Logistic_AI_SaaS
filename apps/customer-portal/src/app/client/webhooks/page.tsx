"use client";

import React, { useEffect, useState } from 'react';
import { Link2, Trash2, Plus, Bell } from 'lucide-react';
import { motion } from 'framer-motion';

import api from '@/lib/api';

export default function ClientWebhooksPage() {
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState('');
  const [error, setError] = useState('');

  const getHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('smartlogi_customer_token')}` });

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    try {
      const res = await api.get('/client/webhooks', { headers: getHeaders() });
      const data = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setWebhooks(data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch webhooks:', err);
      setError('Failed to load webhooks. Please try again later.');
      setWebhooks([]);
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newUrl) {
      try {
        await api.post('/client/webhooks', { url: newUrl, events: ['ALL_EVENTS'] }, { headers: getHeaders() });
        setNewUrl('');
        fetchWebhooks();
      } catch (err) {
        console.error('Failed to create webhook:', err);
        setError('Failed to create webhook. Please try again.');
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/client/webhooks/${id}`, { headers: getHeaders() });
      fetchWebhooks();
    } catch (err) {
      console.error(err);
      setError('Failed to delete webhook. Please try again.');
      setWebhooks(webhooks.filter(w => w.id !== id));
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Webhooks</h1>
          <p className="text-zinc-400 mt-1">Receive real-time HTTP callbacks for system events</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchWebhooks} className="text-xs text-red-400 hover:text-red-300 underline ml-2">
            Try again
          </button>
        </div>
      )}
      <div className="glass-panel p-6 rounded-2xl">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-primary" /> Register New Webhook
        </h3>
        <form onSubmit={handleAdd} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-zinc-400 mb-1">Payload URL</label>
            <input 
              type="url" 
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://your-server.com/webhook"
              className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-primary/50"
              required
            />
          </div>
          <button type="submit" className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors">
            <Plus className="w-4 h-4" /> Add
          </button>
        </form>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          webhooks.length === 0 && !error ? (
            <div className="p-12 text-center">
              <Link2 className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-500">No webhooks registered yet</p>
            </div>
          ) : webhooks.map((webhook, i) => (
            <motion.div 
              key={webhook.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-panel p-6 rounded-2xl flex items-center justify-between group"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/5 rounded-lg text-zinc-400">
                    <Link2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-mono text-white text-sm">{webhook.url}</h4>
                    <p className="text-xs text-zinc-500 mt-0.5">Last triggered: {webhook.lastTriggered}</p>
                  </div>
                </div>
                <div className="flex gap-2 pl-12">
                  {webhook.events.map((ev: string) => (
                    <span key={ev} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] text-zinc-300">
                      {ev}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  webhook.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {webhook.status}
                </span>
                <button 
                  onClick={() => handleDelete(webhook.id)}
                  className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
