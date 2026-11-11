'use client';

import { useState } from 'react';
import { Modal } from 'ui-components';
import type { ToastType } from 'ui-components';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { StatusLabel } from 'ui-kit';
import { isMockDataSource } from '@/lib/data';
import api from '@/lib/api';

/**
 * Hiển thị khi AI cần con người đính chính kết quả dự đoán (cân nặng, nhu cầu).
 *
 * Khi nguồn dữ liệu là mock, giá trị đính chính được ghi nhận tại chỗ thay vì
 * gọi một endpoint không tồn tại; API mode gọi `/logistics/finance/ai/feedback`.
 * Mọi phản hồi đều thông báo bằng toast, không dùng `window.alert`.
 */
interface AIFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  predictionData: PredictionData;
  resourceId: string;
  resourceType: string;
}

type PredictionData = {
  total_weight_kg?: number;
  demand?: number;
  [key: string]: unknown;
};

const PREDICTION_FIELDS: Array<{ key: keyof PredictionData; label: string }> = [
  { key: 'total_weight_kg', label: 'Tổng cân nặng (kg)' },
  { key: 'demand', label: 'Nhu cầu dự báo' },
];

export function AIFeedbackModal({ isOpen, onClose, predictionData, resourceId, resourceType }: AIFeedbackModalProps) {
  const [correctedValue, setCorrectedValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<AIFeedbackRecord[]>([]);

  if (!isOpen) return null;

  const showToast = (message: string, type: ToastType = 'info') => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('show-toast', {
        detail: { message, type },
      }),
    );
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (isMockDataSource) {
        // Dữ liệu mẫu của tenant: ghi nhận bản đính chính tại chỗ, không gọi API.
        setRecords((prev) => [
          ...prev,
          {
            resourceId,
            resourceType,
            prediction: predictionData,
            correctedValue,
            timestamp: new Date().toISOString(),
          },
        ]);
        showToast('Đã ghi nhận đính chính', 'success');
        onClose();
        return;
      }

      await api.post('/logistics/finance/ai/feedback', {
        modelId: 'demand-v1',
        resourceType,
        resourceId,
        aiPrediction: predictionData,
        humanCorrected: { total_weight_kg: parseFloat(correctedValue) },
        confidence: 1.0,
        tenant_id: 'demo-tenant',
        schema_name: 'tenant',
      });
      setRecords((prev) => [
        ...prev,
        {
          resourceId,
          resourceType,
          prediction: predictionData,
          correctedValue,
          timestamp: new Date().toISOString(),
        },
      ]);
      showToast('Đã ghi nhận đính chính', 'success');
      onClose();
    } catch (err) {
      const message = (err as Error)?.message ?? 'Không gửi được phản hồi.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const selected = correctedValue;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="Đính chính giá trị AI"
      className="bg-surface"
      footer={
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={submitting}
            disabled={!selected}
          >
            Xác nhận đính chính
          </Button>
        </div>
      }
    >
      <div className="mb-6 space-y-6">
        {error ? (
          <p className="border-l-2 border-danger py-1 pl-3 text-[12px] text-danger">{error}</p>
        ) : null}

        <p className="text-[13px] leading-5 text-ink-soft">
          AI dự đoán giá trị khác với thực tế nhận biết. Nhập giá trị chính xác để huấn
          luyện lại mô hình cho tenant này.
        </p>

        <div className="rounded-lg border border-line p-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            AI dự đoán
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-4">
            {PREDICTION_FIELDS.map(
              ({ key, label }) =>
                predictionData?.[key] !== undefined && (
                  <StatusLabel key={key} tone="warning">
                    {label}: {predictionData[key] as number | string}
                  </StatusLabel>
                ),
            )}
          </div>
        </div>

        <div>
          <label
            htmlFor="ai-feedback-value"
            className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint"
          >
            Giá trị thực tế
          </label>
          <Input
            id="ai-feedback-value"
            type="number"
            placeholder="Nhập giá trị đúng"
            value={correctedValue}
            onChange={(e) => setCorrectedValue(e.target.value)}
            className="h-9"
          />
        </div>

        <p className="text-[11px] leading-5 text-ink-faint">
          Khi ghi nhận, giá trị bạn nhập sẽ được so khớp với lịch sử chỉnh sửa và
          dùng để tinh chỉnh mô hình demand cho tenant đang hoạt động.
        </p>

        {records.length > 0 ? (
          <p className="text-[11px] leading-5 text-ink-faint">
            Đã ghi nhận {records.length} giá trị đính chính.
          </p>
        ) : null}
      </div>
    </Modal>
  );
}

type AIFeedbackRecord = {
  resourceId: string;
  resourceType: string;
  prediction: PredictionData;
  correctedValue: string;
  timestamp: string;
};
