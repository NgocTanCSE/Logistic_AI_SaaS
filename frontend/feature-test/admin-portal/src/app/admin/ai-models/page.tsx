'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';

type Model = {
  id: string;
  name: string;
  version: string;
  type: string;
  accuracy: number | null;
  is_current: boolean;
  trained_at: string;
  model_path: string;
};

export default function AIModelsPage() {
  const { token } = useAuth();
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModels = async () => {
    if (!token) return;
    try {
      setError(null);
      const res = await api.get('/ai/v1/models');
      const data = res.data;
      setModels(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load AI models');
    } finally {
      setLoading(false);
    }
  };

  const activateModel = async (modelId: string) => {
    try {
      setError(null);
      await api.patch(`/ai/v1/models/${modelId}/activate`);
      setModels(prev =>
        prev.map(m => ({ ...m, is_current: m.id === modelId }))
      );
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to activate model');
    }
  };

  const retrainModel = async (type: string) => {
    try {
      setError(null);
      const payload = { tenant_id: '__system__', schema_name: 'tenant' };
      await api.post(`/ai/v1/train/${type}`, payload);
      alert(`Training job started for ${type}`);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to start training');
    }
  };

  useEffect(() => {
    fetchModels();
  }, [token]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-surface/50 rounded animate-pulse" />
        <div className="h-64 bg-surface/50 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">AI Model Management</h1>
          <p className="text-sm text-inkSoft mt-1">
            View, activate, and retrain AI models used across the platform.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
          <button onClick={fetchModels} className="ml-2 underline">Retry</button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border/50 text-sm text-inkSoft uppercase">
              <th className="py-3 pr-4">Name</th>
              <th className="py-3 pr-4">Version</th>
              <th className="py-3 pr-4">Type</th>
              <th className="py-3 pr-4">Accuracy</th>
              <th className="py-3 pr-4">Status</th>
              <th className="py-3 pr-4">Trained At</th>
              <th className="py-3 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {models.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-inkSoft">
                  No AI models found. Train a model first.
                </td>
              </tr>
            )}
            {models.map(model => (
              <tr key={model.id} className="border-b border-border/30 hover:bg-surface/30 transition-colors">
                <td className="py-3 pr-4 font-medium">{model.name}</td>
                <td className="py-3 pr-4">{model.version}</td>
                <td className="py-3 pr-4">
                  <span className="capitalize px-2 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent">
                    {model.type}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  {model.accuracy != null ? `${(model.accuracy * 100).toFixed(1)}%` : 'N/A'}
                </td>
                <td className="py-3 pr-4">
                  {model.is_current ? (
                    <span className="text-moss text-xs font-semibold">ACTIVE</span>
                  ) : (
                    <span className="text-inkSoft text-xs">Inactive</span>
                  )}
                </td>
                <td className="py-3 pr-4 text-sm text-inkSoft">
                  {new Date(model.trained_at).toLocaleDateString()}
                </td>
                <td className="py-3 pr-4 flex gap-2">
                  {!model.is_current && (
                    <button
                      onClick={() => activateModel(model.id)}
                      className="text-xs px-3 py-1 rounded border border-border hover:bg-surface transition-colors"
                    >
                      Activate
                    </button>
                  )}
                  <button
                    onClick={() => retrainModel(model.type)}
                    className="text-xs px-3 py-1 rounded border border-border hover:bg-surface transition-colors"
                  >
                    Retrain
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
