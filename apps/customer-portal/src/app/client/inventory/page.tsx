"use client";

import React, { useEffect, useState } from 'react';
import { Search, Box } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '@/lib/api';

export default function ClientInventoryPage() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const totalSKUs = inventory.length;
  const inStock = inventory.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const reserved = inventory.reduce((sum, item) => sum + (item.reserved || 0), 0);

  useEffect(() => {
    fetchInventory();
  }, []);

const fetchInventory = async () => {
     try {
       const token = localStorage.getItem('smartlogi_customer_token');
       const userStr = localStorage.getItem('smartlogi_customer_user');
       const user = userStr ? JSON.parse(userStr) : null;
       const res = await api.get('/client/inventory', {
         headers: {
           Authorization: `Bearer ${token}`,
           'x-tenant-slug': user?.slug || 'demo-tenant'
         }
       });
      const data = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setInventory(data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
      setError('Failed to load inventory. Please try again later.');
      setInventory([]);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Inventory</h1>
          <p className="text-zinc-400 mt-1">Real-time visibility into your stock levels</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-panel p-6 rounded-2xl flex items-center gap-4">
          <div className="p-4 bg-primary/20 text-primary rounded-xl">
            {/* @ts-ignore */}
            <Box className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-zinc-400">Total SKUs</p>
            <p className="text-2xl font-bold text-white">{totalSKUs || '—'}</p>
          </div>
        </div>
        <div className="glass-panel p-6 rounded-2xl flex items-center gap-4">
          <div className="p-4 bg-emerald-500/20 text-emerald-500 rounded-xl">
            {/* @ts-ignore */}
            <Box className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-zinc-400">In Stock</p>
            <p className="text-2xl font-bold text-white">{inStock || '—'}</p>
          </div>
        </div>
        <div className="glass-panel p-6 rounded-2xl flex items-center gap-4">
          <div className="p-4 bg-orange-500/20 text-orange-500 rounded-xl">
            {/* @ts-ignore */}
            <Box className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-zinc-400">Reserved for Orders</p>
            <p className="text-2xl font-bold text-white">{reserved || '—'}</p>
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search by SKU or name..." 
              className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-primary/50"
            />
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchInventory} className="text-xs text-red-400 hover:text-red-300 underline ml-2">
              Try again
            </button>
          </div>
        )}
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : inventory.length === 0 && !error ? (
          <div className="p-12 text-center">
            <Box className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-500">No inventory data found</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm text-zinc-400">
            <thead className="bg-white/5 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-6 py-4 font-medium">SKU</th>
                <th className="px-6 py-4 font-medium">Product Name</th>
                <th className="px-6 py-4 font-medium text-right">Available</th>
                <th className="px-6 py-4 font-medium text-right">Reserved</th>
                <th className="px-6 py-4 font-medium">Warehouse Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {inventory.map((item, i) => (
                <motion.tr 
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="hover:bg-white/5 transition-colors group cursor-pointer"
                >
                  <td className="px-6 py-4 font-mono text-white group-hover:text-primary transition-colors">
                    {item.sku}
                  </td>
                  <td className="px-6 py-4 font-medium text-white">{item.name}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={item.quantity < 10 ? "text-red-400 font-bold" : "text-emerald-400 font-bold"}>
                      {item.quantity}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-orange-400">{item.reserved}</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-white/5 rounded text-xs">{item.warehouse}</span>
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
