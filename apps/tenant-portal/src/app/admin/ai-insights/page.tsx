'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { RoleGuard } from '@/components/auth/RoleGuard';

type AiModel = {
  id: string;
  name: string;
  version: string;
  type: string;
  accuracy: number;
  trainedAt: string;
  isCurrent: boolean;
};

type AiFeedback = {
  id: string;
  resourceType: string;
  resourceId: string;
  aiPrediction: any;
  humanCorrected: any;
  confidence: number;
  isUsedForTrain: boolean;
  createdAt: string;
};

export default function AiInsightsPage() {
  return (
    <RoleGuard allowedRoles={['TENANT_ADMIN']}>
      <AiInsightsContent />
    </RoleGuard>
  );
}

function AiInsightsContent() {
  const [models, setModels] = useState<AiModel[]>([]);
  const [feedbacks, setFeedbacks] = useState<AiFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyModalOpen, setApplyModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [modelsRes, feedbackRes] = await Promise.all([
        api.get('/logistics/ai/models'),
        api.get('/logistics/ai/feedbacks?isUsed=false')
      ]);
      setModels(modelsRes.data || []);
      setFeedbacks(feedbackRes.data || []);
    } catch (err) {
      console.error("Failed to fetch AI data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsUsed = async (id: string) => {
    try {
      await api.patch(`/logistics/ai/feedback/${id}/used`);
      setApplyModalOpen(true);
      fetchData();
    } catch (err) {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Failed to update feedback status', type: 'error' } }));
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-ink tracking-tight">AI Insights & Training</h1>
        <p className="text-sm text-inkSoft mt-2 font-medium">Monitor model accuracy and manage human-in-the-loop feedback.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        {loading ? (
          <div className="lg:col-span-3 py-10 text-center text-slate-400 font-bold uppercase text-[11px]">Analyzing Neural Networks...</div>
        ) : models.map(model => (
          <Card key={model.id} className={model.isCurrent ? 'border-primary bg-primary/5' : ''}>
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <Badge variant={model.isCurrent ? 'info' : 'neutral'}>{model.type}</Badge>
                {model.isCurrent && <Badge variant="success">ACTIVE</Badge>}
              </div>
              <h3 className="text-xl font-bold text-ink">{model.name}</h3>
              <p className="text-xs text-slate-400 font-bold uppercase mt-1">Version {model.version}</p>
              
              <div className="mt-6 flex items-end gap-2">
                <span className="text-3xl font-black text-primary">{Number(model.accuracy).toFixed(1)}%</span>
                <span className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Accuracy Score</span>
              </div>
              
              <div className="mt-6 pt-6 border-t border-slate-100 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                 <span>Trained At</span>
                 <span>{new Date(model.trainedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <h2 className="text-2xl font-bold text-ink mb-6">Pending Training Feedback</h2>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-border">
                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Resource</th>
                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Correction Detail</th>
                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Confidence</th>
                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={4} className="px-8 py-10 text-center text-slate-400 font-bold uppercase text-[10px]">Filtering corrections...</td></tr>
              ) : feedbacks.length === 0 ? (
                <tr><td colSpan={4} className="px-8 py-20 text-center text-slate-400 font-medium italic">No new human corrections found for training.</td></tr>
              ) : (
                feedbacks.map(fb => (
                  <tr key={fb.id} className="hover:bg-slate-50/80 transition-all">
                    <td className="px-8 py-6">
                      <Badge variant="neutral" className="mb-1">{fb.resourceType}</Badge>
                      <div className="text-[10px] font-mono text-slate-400 truncate max-w-[150px]">{fb.resourceId}</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-sm font-bold text-ink">Correction Applied</div>
                      <div className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Received: {fb.createdAt ? new Date(fb.createdAt).toLocaleString() : 'N/A'}</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                           <div className="h-full bg-primary" style={{ width: `${Number(fb.confidence) * 100}%` }}></div>
                        </div>
                        <span className="text-[10px] font-bold text-ink">{(Number(fb.confidence) * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <Button variant="outline" size="sm" onClick={() => handleMarkAsUsed(fb.id)} className="text-[10px] font-bold tracking-widest uppercase">
                          ARCHIVE FOR TRAIN
                       </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Apply Insight Modal */}
      {applyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-8 text-center border-t-4 border-t-primary">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <h2 className="text-xl font-bold text-ink mb-2">Insight Applied</h2>
            <p className="text-slate-500 text-sm mb-6">
              The feedback has been queued into the next Machine Learning pipeline for model retraining.
            </p>
            <Button variant="primary" className="w-full" onClick={() => setApplyModalOpen(false)}>Acknowledge</Button>
          </div>
        </div>
      )}
    </div>
  );
}
