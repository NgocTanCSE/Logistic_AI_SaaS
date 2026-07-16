'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { StatCard } from '@/components/dashboard/StatCard';
import { MRRChart } from '@/components/dashboard/MRRChart';
import { GrowthChart } from '@/components/dashboard/GrowthChart';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { MagneticButton } from '@/components/ui/MagneticButton';

type StatData = {
  totalTenants: number;
  totalUsers: number;
  totalMrr: number;
  revenueData: { month: string; amount: number }[];
  growthData: { month: string; tenants: number }[];
};

// Framer Motion Variants for Staggered Animation
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
};

export default function AdminDashboardPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<StatData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [systemActivities, setSystemActivities] = useState<any[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);

  const handleOnboardClick = () => {
    setIsNavigating(true);
    router.push('/admin/tenants?action=new');
  };

  const fetchStats = async () => {
    if (!token) return;
    try {
      setApiError(null);
      const response = await api.get('/admin/dashboard/stats');
      const data = response.data;
      setStats({
        totalTenants: Number(data?.totalTenants) || 0,
        totalUsers: Number(data?.totalUsers) || 0,
        totalMrr: Number(data?.totalMrr) || 0,
        revenueData: Array.isArray(data?.revenueData) ? data.revenueData : [],
        growthData: Array.isArray(data?.growthData) ? data.growthData : []
      });
    } catch (err: any) {
      console.error('API Error fetching stats:', err);
      setApiError(err.response?.data?.message || err.message || 'Failed to fetch dashboard data');
      setStats({ totalTenants: 0, totalUsers: 0, totalMrr: 0, revenueData: [], growthData: [] });
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    if (!token) return;
    try {
      setActivitiesError(null);
      const res = await api.get('/admin/audit-logs?limit=10');
      setSystemActivities(res.data?.data || []);
    } catch (err: any) {
      console.error('Failed to fetch activities:', err);
      setActivitiesError(err.response?.data?.message || err.message || 'Failed to load activities');
    } finally {
      setActivitiesLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [token]);

  useEffect(() => {
    fetchActivities();
  }, [token]);

  if (loading || !stats) {
    return (
      <div className="flex gap-6 flex-wrap pb-10">
        {[1,2,3,4].map((i) => (
          <div key={i} className="h-32 bg-surface/50 rounded-2xl w-full md:w-[23%] animate-pulse border border-border/50"></div>
        ))}
        <div className="h-[400px] bg-surface/50 rounded-2xl w-full lg:w-[48%] animate-pulse mt-4 border border-border/50"></div>
        <div className="h-[400px] bg-surface/50 rounded-2xl w-full lg:w-[48%] animate-pulse mt-4 border border-border/50"></div>
      </div>
    );
  }

  return (
    <motion.div 
      initial="hidden" 
      animate="show" 
      variants={containerVariants}
      className="space-y-6 pb-10"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink tracking-tight">Super Admin Overview</h2>
          <p className="text-sm text-inkSoft mt-1">Monitor global SaaS performance, MRR, and platform health.</p>
        </div>
        <div className="flex items-center gap-3">
          <MagneticButton className="inline-flex">
            <button 
              onClick={handleOnboardClick}
              disabled={isNavigating}
              aria-label="Onboard new tenant"
              className="neon-button text-sm px-4 py-2 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
            >
              {isNavigating ? (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
              )}
              Onboard Tenant
            </button>
          </MagneticButton>
        </div>
      </div>

      <ErrorBanner message={apiError || undefined} onRetry={fetchStats} />

      {/* STAT CARDS - Staggered */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div variants={itemVariants} className="h-full">
          <StatCard 
            title="Total MRR" 
            value={`$${(stats.totalMrr / 1000).toFixed(1)}k`} 
            trend={{ value: "+15.2%", isPositive: true }}
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            } 
          />
        </motion.div>

        <motion.div variants={itemVariants} className="h-full">
          <StatCard 
            title="Active Tenants" 
            value={stats.totalTenants.toString()} 
            trend={{ value: "+3 this week", isPositive: true }}
            icon={
              <svg className="w-6 h-6 text-cobalt" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            } 
          />
        </motion.div>

        <motion.div variants={itemVariants} className="h-full">
          <StatCard 
            title="Total Users" 
            value={stats.totalUsers.toLocaleString()} 
            trend={{ value: "+120", isPositive: true }}
            icon={
              <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            } 
          />
        </motion.div>

        <motion.div variants={itemVariants} className="h-full">
          <StatCard 
            title="System Health" 
            value="99.99%" 
            trend={{ value: "All Systems Go", isPositive: true }}
            icon={
              <svg className="w-6 h-6 text-moss" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
              </svg>
            } 
          />
        </motion.div>
      </div>

      {/* CHARTS LAYER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={itemVariants} className="glass-panel p-6 flex flex-col min-h-[400px] hover:shadow-lg transition-all duration-300">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-ink">Monthly Recurring Revenue</h3>
              <p className="text-sm text-inkSoft mt-1">Platform-wide MRR growth over 6 months</p>
            </div>
            <div className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-xs font-semibold border border-blue-500/20">
              MRR
            </div>
          </div>
          <div className="flex-1 -ml-4 mt-2">
            <MRRChart data={stats.revenueData} />
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="glass-panel p-6 flex flex-col min-h-[400px] hover:shadow-lg transition-all duration-300">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-ink">Tenant Growth</h3>
              <p className="text-sm text-inkSoft mt-1">Total active tenants onboarding trend</p>
            </div>
            <div className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-semibold border border-emerald-500/20">
              Users
            </div>
          </div>
          <div className="flex-1 -ml-4 mt-2">
            <GrowthChart data={stats.growthData} />
          </div>
        </motion.div>
      </div>

      {/* ACTIVITY LAYER */}
      <motion.div variants={itemVariants} className="glass-panel p-6 flex flex-col max-h-[500px]">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-bold text-ink">Platform Logs & Activities</h3>
            <p className="text-sm text-inkSoft mt-1">Real-time global system alerts</p>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          {activitiesLoading ? (
            <div className="flex items-center justify-center h-full py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cobalt"></div>
              <span className="ml-3 text-sm text-inkSoft">Loading activities...</span>
            </div>
          ) : activitiesError ? (
            <div className="flex flex-col items-center justify-center h-full py-8 text-center">
              <p className="text-sm text-red-400 mb-2">{activitiesError}</p>
              <button onClick={fetchActivities} className="text-xs text-cobalt hover:underline">
                Try again
              </button>
            </div>
          ) : (
            <ActivityFeed activities={systemActivities} />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
