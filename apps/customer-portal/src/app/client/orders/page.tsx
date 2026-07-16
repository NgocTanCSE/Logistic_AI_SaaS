"use client";

import React, { useEffect, useState } from 'react';
import { Plus, Upload, Search, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '@/lib/api';

export default function ClientOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

const fetchOrders = async () => {
     try {
       const token = localStorage.getItem('smartlogi_customer_token');
       const userStr = localStorage.getItem('smartlogi_customer_user');
       const user = userStr ? JSON.parse(userStr) : null;
       const res = await api.get('/client/orders', { 
         headers: { 
           Authorization: `Bearer ${token}`,
           'x-tenant-slug': user?.slug || 'demo-tenant'
         } 
       });
      const data = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setOrders(data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError('Failed to load orders. Please try again later.');
      setOrders([]);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Orders</h1>
          <p className="text-zinc-400 mt-1">Manage your B2B shipments</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
            <Upload className="w-4 h-4" />
            Bulk Upload
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors font-medium">
            <Plus className="w-4 h-4" />
            New Order
          </button>
        </div>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search by tracking code..." 
              className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-primary/50"
            />
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchOrders} className="text-xs text-red-400 hover:text-red-300 underline ml-2">
              Try again
            </button>
          </div>
        )}
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : orders.length === 0 && !error ? (
          <div className="p-12 text-center">
            <FileText className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-500">No orders found</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm text-zinc-400">
            <thead className="bg-white/5 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-6 py-4 font-medium">Tracking Code</th>
                <th className="px-6 py-4 font-medium">Reference</th>
                <th className="px-6 py-4 font-medium">Recipient</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Fee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {orders.map((order, i) => (
                <motion.tr 
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="hover:bg-white/5 transition-colors group cursor-pointer"
                >
                  <td className="px-6 py-4 font-mono text-white group-hover:text-primary transition-colors">
                    {order.trackingCode}
                  </td>
                  <td className="px-6 py-4">{order.clientOrderRef}</td>
                  <td className="px-6 py-4">{order.recipientName}</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-white/10 rounded-full text-xs font-medium">
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-white">
                    ${order.shippingFee.toFixed(2)}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
