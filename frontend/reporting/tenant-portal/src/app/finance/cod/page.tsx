'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EditorialPageHeader,
  EditorialSection,
  EmptyNote,
  MetricBand,
  StatusLabel,
} from 'ui-kit';
import type { EditorialMetric } from 'ui-kit';
import { Button, DataState, Input, Modal, Select, TableState } from 'ui-components';
import { data } from '@/lib/data';
import type { BankTransaction, CodRemittance } from '@/lib/mock';
import {
  codStatusLabel,
  codStatusTone,
  formatCurrency,
  formatDateVN,
  formatDateTimeVN,
  formatNumber,
} from '@/lib/labels';
import { RoleGuard } from '@/components/auth/RoleGuard';

const STATUS_FILTER: { label: string; value: CodRemittance['status'] | '' }[] = [
  { label: 'Tất cả', value: '' },
  { label: 'Chờ nộp', value: 'PENDING' },
  { label: 'Đã nộp', value: 'SUBMITTED' },
  { label: 'Đang lệch', value: 'DISPUTED' },
  { label: 'Đã đối soát', value: 'RECONCILED' },
];

type MatchOutcome = {
  key: string;
  statement: string;
  amount: number;
  status: 'MATCHED' | 'DISPUTED' | 'NO_TXN' | 'NO_REMITTANCE' | 'ERROR';
  detail: string;
};

const OUTCOME_LABEL: Record<MatchOutcome['status'], string> = {
  MATCHED: 'Khớp',
  DISPUTED: 'Lệch tiền',
  NO_TXN: 'Không có giao dịch',
  NO_REMITTANCE: 'Không có phiếu',
  ERROR: 'Lỗi',
};

const OUTCOME_TONE: Record<
  MatchOutcome['status'],
  'success' | 'warning' | 'danger' | 'neutral' | 'info'
> = {
  MATCHED: 'success',
  DISPUTED: 'warning',
  NO_TXN: 'danger',
  NO_REMITTANCE: 'danger',
  ERROR: 'danger',
};

type ParsedLine = {
  amount: number;
  bankRef: string;
  description: string;
};

/** Dòng sao kê dán vào: `số tiền | mã tham chiếu | mô tả`. */
function parseStatement(text: string): ParsedLine[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/[|;,\t]/).map((part) => part.trim());
      const amount = Number((parts[0] ?? '').replace(/[^\d-]/g, ''));
      return {
        amount,
        bankRef: parts[1] ?? '',
        description: parts.slice(2).join(' ') || 'Sao kê dán tay',
      };
    })
    .filter((row) => Number.isFinite(row.amount) && row.amount > 0);
}

function normalizeRef(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase();
}

export default function CodRemittancePage() {
  const [remittances, setRemittances] = useState<CodRemittance[]>([]);
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');

  const [submitTarget, setSubmitTarget] = useState<CodRemittance | null>(null);
  const [submitAmount, setSubmitAmount] = useState('');
  const [reconcileTarget, setReconcileTarget] = useState<CodRemittance | null>(null);
  const [bankId, setBankId] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');

  const [statementText, setStatementText] = useState('');
  const [outcomes, setOutcomes] = useState<MatchOutcome[]>([]);
  const [autoBusy, setAutoBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [remitted, transactions] = await Promise.all([
        data.remittances.list(),
        data.bankTransactions.list(),
      ]);
      setRemittances(remitted.sort((a, b) => a.code.localeCompare(b.code)));
      setBankTransactions(
        transactions.sort((a, b) => b.txnDate.localeCompare(a.txnDate)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được đối soát COD.');
      setRemittances([]);
      setBankTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visibleRemittances = useMemo(() => {
    const term = query.trim().toLowerCase();
    return remittances
      .filter((row) => (statusFilter ? row.status === statusFilter : true))
      .filter((row) => {
        if (!term) return true;
        return (
          row.code.toLowerCase().includes(term) ||
          row.driverName.toLowerCase().includes(term) ||
          row.tripCode.toLowerCase().includes(term)
        );
      });
  }, [remittances, statusFilter, query]);

  const pending = remittances.filter((row) => row.status === 'PENDING');
  const disputed = remittances.filter((row) => row.status === 'DISPUTED');
  const reconciled = remittances.filter((row) => row.status === 'RECONCILED');
  const totalExpected = remittances.reduce((sum, row) => sum + row.expectedAmount, 0);
  const totalSubmitted = remittances.reduce((sum, row) => sum + row.submittedAmount, 0);
  const totalVariance = totalExpected - totalSubmitted;

  /** Giao dịch ngân hàng chưa khớp, kèm phiếu có cùng số tiền đã nộp. */
  const unmatchedBank = useMemo(
    () => bankTransactions.filter((row) => !row.matchedRemittanceId),
    [bankTransactions],
  );

  const suggestionFor = useCallback(
    (txn: BankTransaction): CodRemittance | null => {
      const candidates = remittances.filter(
        (row) =>
          (row.status === 'SUBMITTED' || row.status === 'DISPUTED') &&
          Math.round(row.submittedAmount) === Math.round(txn.amount),
      );
      return candidates[0] ?? null;
    },
    [remittances],
  );

  const readyToMatch = unmatchedBank.filter((txn) => suggestionFor(txn) !== null).length;

  const metrics: EditorialMetric[] = [
    {
      label: 'Phiếu phải thu',
      value: formatCurrency(totalExpected),
      meta: `${remittances.length} phiếu trong kỳ`,
    },
    {
      label: 'Đã nộp',
      value: formatCurrency(totalSubmitted),
      meta: `${reconciled.length} phiếu đã đối soát`,
    },
    {
      label: 'Chênh lệch',
      value: formatCurrency(totalVariance),
      meta: totalVariance > 0 ? 'Số tiền còn thiếu' : 'Không thiếu',
      tone: totalVariance !== 0 ? 'warning' : 'success',
    },
    {
      label: 'Cần xử lý',
      value: `${pending.length} / ${disputed.length}`,
      meta: 'Chờ nộp / đang lệch',
      tone: pending.length + disputed.length > 0 ? 'danger' : 'success',
    },
  ];

  const openSubmit = (row: CodRemittance) => {
    setSubmitTarget(row);
    setSubmitAmount(String(row.expectedAmount));
    setActionError('');
  };

  const openReconcile = (row: CodRemittance) => {
    setReconcileTarget(row);
    setBankId('');
    setActionError('');
  };

  const submit = async () => {
    if (!submitTarget) return;
    const amount = Number(submitAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setActionError('Số tiền nộp phải lớn hơn 0.');
      return;
    }
    setSaving(true);
    setActionError('');
    try {
      const updated = await data.remittances.submit(submitTarget.id, amount);
      setNotice(
        updated.status === 'SUBMITTED'
          ? `Đã ghi nộp ${formatCurrency(amount)} cho ${updated.code}, chờ đối soát ngân hàng.`
          : `Phiếu ${updated.code} lệch ${formatCurrency(updated.variance)}, chuyển sang trạng thái Đang lệch.`,
      );
      setSubmitTarget(null);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Không nộp được quyết toán.');
    } finally {
      setSaving(false);
    }
  };

  const reconcile = async () => {
    if (!reconcileTarget || !bankId) return;
    setSaving(true);
    setActionError('');
    try {
      const result = await data.remittances.reconcile(reconcileTarget.id, bankId);
      setNotice(
        result.status === 'RECONCILED'
          ? `Đã đối soát ${result.code} với giao dịch ${result.bankRef}.`
          : `Giao dịch không khớp số tiền: ${result.note ?? 'kiểm tra lại sao kê'}.`,
      );
      setReconcileTarget(null);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Không đối soát được.');
    } finally {
      setSaving(false);
    }
  };

  /** Khớp nhanh một giao dịch với phiếu gợi ý. */
  const matchOne = async (txn: BankTransaction) => {
    const candidate = suggestionFor(txn);
    if (!candidate) {
      setNotice(`Giao dịch ${txn.bankRef} không có phiếu nộp cùng số tiền.`);
      return;
    }
    setSaving(true);
    setNotice('');
    try {
      const result = await data.remittances.reconcile(candidate.id, txn.id);
      setNotice(
        result.status === 'RECONCILED'
          ? `Khớp ${txn.bankRef} ↔ ${result.code} (${formatCurrency(txn.amount)}).`
          : `Giao dịch ${txn.bankRef} lệch so với phiếu ${result.code}.`,
      );
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Không khớp được giao dịch.');
    } finally {
      setSaving(false);
    }
  };

  const fillSampleStatement = () => {
    if (unmatchedBank.length === 0) {
      setNotice('Không còn giao dịch chưa khớp để nạp mẫu.');
      return;
    }
    setStatementText(
      unmatchedBank
        .map((txn) => `${txn.amount}|${txn.bankRef}|${txn.description}`)
        .join('\n'),
    );
    setOutcomes([]);
  };

  /**
   * Đối soát sao kê dán tay:
   * 1. tìm giao dịch theo mã tham chiếu, nếu không có thì theo số tiền chưa khớp;
   * 2. tìm phiếu nộp cùng số tiền (SUBMITTED/DISPUTED);
   * 3. gọi reconcile — mock so khớp số tiền và trả RECONCILED hoặc DISPUTED.
   */
  const runAutoMatch = async () => {
    const lines = parseStatement(statementText);
    if (lines.length === 0) {
      setNotice('Chưa có dòng sao kê hợp lệ. Định dạng: số tiền | mã tham chiếu | mô tả.');
      return;
    }
    setAutoBusy(true);
    setNotice('');
    try {
      const [txns, remits] = await Promise.all([
        data.bankTransactions.list(),
        data.remittances.list(),
      ]);
      const usedTxns = new Set<string>();
      const usedRemits = new Set<string>();
      const results: MatchOutcome[] = [];

      for (const [index, line] of lines.entries()) {
        const key = `line-${index}`;
        const byRef = txns.find(
          (txn) => normalizeRef(txn.bankRef) === normalizeRef(line.bankRef),
        );
        const byAmount = txns.find(
          (txn) =>
            !usedTxns.has(txn.id) &&
            !txn.matchedRemittanceId &&
            Math.round(txn.amount) === Math.round(line.amount),
        );
        const txn = byRef ?? byAmount;
        if (!txn) {
          results.push({
            key,
            statement: line.description,
            amount: line.amount,
            status: 'NO_TXN',
            detail: `Không tìm thấy giao dịch ${line.bankRef || 'cùng số tiền'} trong sao kê.`,
          });
          continue;
        }
        if (txn.matchedRemittanceId) {
          results.push({
            key,
            statement: line.description,
            amount: line.amount,
            status: 'ERROR',
            detail: `Giao dịch ${txn.bankRef} đã được đối soát trước đó.`,
          });
          continue;
        }
        const candidate = remits.find(
          (row) =>
            !usedRemits.has(row.id) &&
            (row.status === 'SUBMITTED' || row.status === 'DISPUTED') &&
            Math.round(row.submittedAmount) === Math.round(txn.amount),
        );
        if (!candidate) {
          results.push({
            key,
            statement: line.description,
            amount: line.amount,
            status: 'NO_REMITTANCE',
            detail: `Có giao dịch ${txn.bankRef} nhưng không có phiếu nộp ${formatCurrency(
              txn.amount,
            )}.`,
          });
          continue;
        }
        try {
          const reconciled = await data.remittances.reconcile(candidate.id, txn.id);
          usedTxns.add(txn.id);
          usedRemits.add(candidate.id);
          results.push({
            key,
            statement: line.description,
            amount: line.amount,
            status: reconciled.status === 'RECONCILED' ? 'MATCHED' : 'DISPUTED',
            detail:
              reconciled.status === 'RECONCILED'
                ? `${txn.bankRef} ↔ ${reconciled.code}`
                : reconciled.note ?? 'Số tiền không khớp.',
          });
        } catch (err) {
          results.push({
            key,
            statement: line.description,
            amount: line.amount,
            status: 'ERROR',
            detail: err instanceof Error ? err.message : 'Không đối soát được.',
          });
        }
      }

      setOutcomes(results);
      const matched = results.filter((row) => row.status === 'MATCHED').length;
      setNotice(
        `Đã xử lý ${results.length} dòng: ${matched} khớp, ${
          results.length - matched
        } dòng cần kiểm tra.`,
      );
      await load();
    } finally {
      setAutoBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <EditorialPageHeader
        eyebrow="Tài chính · COD"
        title="Đối soát COD"
        description="Phiếu quyết toán của tài xế được khớp với sao kê ngân hàng theo mã tham chiếu và số tiền. Mọi lệch tiền đều giữ lại dấu vết để đối chiếu biên lai thay vì sửa tay số liệu."
        meta={`${pending.length} chờ nộp · ${formatCurrency(totalExpected)} phải thu`}
        actions={
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            Làm mới
          </Button>
        }
      />

      <MetricBand metrics={metrics} />

      {notice ? (
        <div className="border-l-2 border-accent bg-surface px-3 py-2 text-[12px] text-ink">
          {notice}
        </div>
      ) : null}

      {error ? (
        <div className="flex items-center gap-3 border-l-2 border-danger bg-surface px-3 py-2">
          <StatusLabel tone="danger">Lỗi dữ liệu</StatusLabel>
          <span className="text-[12px] text-ink-soft">{error}</span>
          <button
            type="button"
            onClick={load}
            className="ml-auto text-[11px] font-medium text-accent hover:underline"
          >
            Thử lại
          </button>
        </div>
      ) : null}

      <EditorialSection
        title="Phiếu quyết toán"
        eyebrow="Tài xế chịu trách nhiệm nộp"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-40">
              <Select
                className="h-8"
                aria-label="Lọc trạng thái phiếu"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                options={STATUS_FILTER.map((item) => ({
                  value: item.value,
                  label: item.label,
                }))}
              />
            </div>
            <Input
              type="search"
              placeholder="Tìm mã phiếu, tài xế, chuyến"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-8 w-56"
            />
          </div>
        }
      >
        <div className="overflow-x-auto border border-line">
          <table className="min-w-full divide-y divide-line">
            <thead className="bg-surface-alt">
              <tr>
                {[
                  'Mã phiếu',
                  'Tài xế / chuyến',
                  'Dự kiến',
                  'Đã nộp',
                  'Lệch',
                  'Trạng thái',
                  'Đối soát lúc',
                  '',
                ].map((label, index) => (
                  <th
                    key={`${label}-${index}`}
                    className="whitespace-nowrap px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-[12px]">
              <TableState
                loading={loading}
                empty={!loading && visibleRemittances.length === 0}
                error={error ? new Error(error) : undefined}
                onRetry={load}
                colSpan={8}
                emptyTitle="Không có phiếu quyết toán"
                emptyDescription="Đổi bộ lọc hoặc chờ chuyến kết thúc để sinh phiếu."
              >
                {visibleRemittances.map((row) => {
                  const canSubmit =
                    row.status === 'PENDING' ||
                    row.status === 'SUBMITTED' ||
                    row.status === 'DISPUTED';
                  const canReconcile =
                    row.status === 'SUBMITTED' || row.status === 'DISPUTED';
                  return (
                    <tr key={row.id} className="hover:bg-surface-alt">
                      <td className="px-3 py-2 font-mono text-[11px] font-medium text-ink">
                        {row.code}
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-ink">{row.driverName}</div>
                        <div className="text-[11px] text-ink-faint">{row.tripCode}</div>
                      </td>
                      <td className="px-3 py-2 tabular-nums text-ink">
                        {formatCurrency(row.expectedAmount)}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-ink-soft">
                        {row.submittedAmount > 0 ? formatCurrency(row.submittedAmount) : '—'}
                      </td>
                      <td
                        className={`px-3 py-2 tabular-nums font-medium ${
                          row.variance === 0
                            ? 'text-ink-soft'
                            : row.variance > 0
                              ? 'text-success'
                              : 'text-danger'
                        }`}
                      >
                        {row.variance === 0
                          ? '—'
                          : `${row.variance > 0 ? '+' : ''}${formatCurrency(row.variance)}`}
                      </td>
                      <td className="px-3 py-2">
                        <StatusLabel tone={codStatusTone(row.status)}>
                          {codStatusLabel(row.status)}
                        </StatusLabel>
                        {row.note ? (
                          <div className="mt-0.5 max-w-[240px] text-[10px] text-ink-faint">
                            {row.note}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-ink-faint">
                        {row.reconciledAt ? formatDateTimeVN(row.reconciledAt) : '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <div className="flex items-center gap-3 text-[11px]">
                          {canSubmit ? (
                            <button
                              type="button"
                              className="font-semibold text-ink-soft hover:text-accent"
                              onClick={() => openSubmit(row)}
                            >
                              Nộp tiền
                            </button>
                          ) : null}
                          {canReconcile ? (
                            <button
                              type="button"
                              className="font-semibold text-accent hover:underline"
                              onClick={() => openReconcile(row)}
                            >
                              Đối soát
                            </button>
                          ) : null}
                          {row.status === 'RECONCILED' ? (
                            <span className="font-mono text-[10px] text-ink-faint">
                              {row.bankRef}
                            </span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </TableState>
            </tbody>
          </table>
        </div>
      </EditorialSection>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <EditorialSection
          title="Giao dịch ngân hàng chưa khớp"
          eyebrow="Sao kê đầu vào"
          action={
            <span className="text-[11px] text-ink-faint">
              {readyToMatch}/{unmatchedBank.length} giao dịch có phiếu cùng số tiền
            </span>
          }
        >
          <DataState
            loading={loading}
            empty={!loading && unmatchedBank.length === 0}
            error={error}
            onRetry={load}
            emptyTitle="Không còn giao dịch chưa khớp"
            emptyDescription="Mọi khoản nộp COD gần nhất đã được đối soát."
          >
            <div className="overflow-x-auto border border-line">
              <table className="min-w-full divide-y divide-line">
                <thead className="bg-surface-alt">
                  <tr>
                    {['Ngày', 'Mô tả', 'Số tiền', 'Mã tham chiếu', 'Phiếu gợi ý', ''].map(
                      (label, index) => (
                        <th
                          key={`${label}-${index}`}
                          className="whitespace-nowrap px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint"
                        >
                          {label}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-[12px]">
                  {unmatchedBank.map((txn) => {
                    const candidate = suggestionFor(txn);
  return (
    <RoleGuard allowedRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'LOGISTICS_MANAGER']} fallbackHref="/dashboard">
                        <tr key={txn.id} className="hover:bg-surface-alt">
                          <td className="px-3 py-2 tabular-nums text-ink-soft">
                            {formatDateVN(txn.txnDate)}
                          </td>
                          <td className="px-3 py-2 text-ink">{txn.description}</td>
                          <td className="px-3 py-2 tabular-nums font-medium text-ink">
                            {formatCurrency(txn.amount)}
                          </td>
                          <td className="px-3 py-2 font-mono text-[10px] text-ink-faint">
                            {txn.bankRef}
                          </td>
                          <td className="px-3 py-2">
                            {candidate ? (
                              <span className="font-mono text-[11px] text-ink">
                                {candidate.code}
                                <span className="ml-1 text-ink-faint">
                                  {candidate.status === 'DISPUTED' ? '(lệch)' : ''}
                                </span>
                              </span>
                            ) : (
                              <StatusLabel tone="warning">Không có phiếu</StatusLabel>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2">
                            <button
                              type="button"
                              disabled={!candidate || saving}
                              onClick={() => matchOne(txn)}
                              className="text-[11px] font-semibold text-accent hover:underline disabled:text-ink-faint disabled:no-underline"
                            >
                              Khớp
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </DataState>
          </EditorialSection>

          <EditorialSection
            title="Đối soát sao kê tự động"
            eyebrow="Dán sao kê hoặc nạp mẫu"
            action={
              <button
                type="button"
                onClick={fillSampleStatement}
                className="text-[11px] font-semibold text-accent hover:underline"
              >
                Nạp mẫu
              </button>
            }
          >
            <div className="space-y-3">
              <p className="text-[12px] leading-6 text-ink-soft">
                Mỗi dòng theo thứ tự{' '}
                <span className="font-mono text-[11px] text-ink">
                  số tiền | mã tham chiếu | mô tả
                </span>
                . Hệ thống khớp mã tham chiếu trước, rồi mới đối chiếu số tiền đã nộp của tài xế.
              </p>
              <textarea
                value={statementText}
                onChange={(event) => setStatementText(event.target.value)}
                rows={6}
                className="w-full rounded-md border border-line bg-surface px-3 py-2 font-mono text-[12px] text-ink focus:border-accent focus:outline-none"
                placeholder={'4200000|VCB-20261110-0455|NOP TIEN COD TRP-4100'}
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-ink-faint">
                  {parseStatement(statementText).length} dòng hợp lệ
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStatementText('');
                      setOutcomes([]);
                    }}
                  >
                    Xoá
                  </Button>
                  <Button size="sm" onClick={runAutoMatch} isLoading={autoBusy}>
                    Chạy đối soát
                  </Button>
                </div>
              </div>

              {outcomes.length === 0 ? (
                <EmptyNote>
                  Chưa chạy đối soát. Kết quả từng dòng hiện ở đây sau khi chạy.
                </EmptyNote>
              ) : (
                <div className="divide-y divide-line border-y border-line">
                  {outcomes.map((row) => (
                    <div key={row.key} className="py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="tabular-nums text-[12px] font-medium text-ink">
                          {formatCurrency(row.amount)}
                        </span>
                        <StatusLabel tone={OUTCOME_TONE[row.status]}>
                          {OUTCOME_LABEL[row.status]}
                        </StatusLabel>
                      </div>
                      <div className="mt-0.5 text-[11px] text-ink-soft">{row.statement}</div>
                      <div className="text-[11px] text-ink-faint">{row.detail}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </EditorialSection>
        </div>

        <EditorialSection title="Quy tắc đối soát" eyebrow="Ch. 12 · Tài chính">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="border border-line p-3 text-[12px] text-ink-soft">
              <div className="font-semibold text-ink">1. Mã QR trên biên lai</div>
              <p className="mt-1">
                Biên lai COD in mã phiếu. Tài xế ghi mã vào nội dung chuyển khoản để ngân hàng trả
                lại mã tham chiếu.
              </p>
            </div>
            <div className="border border-line p-3 text-[12px] text-ink-soft">
              <div className="font-semibold text-ink">2. Khớp hai lớp</div>
              <p className="mt-1">
                Khớp mã tham chiếu trước; nếu không có thì khớp số tiền đã nộp. Một giao dịch chỉ
                được khớp một lần.
              </p>
            </div>
            <div className="border border-line p-3 text-[12px] text-ink-soft">
              <div className="font-semibold text-ink">3. Giữ lại chênh lệch</div>
              <p className="mt-1">
                Lệch tiền không bị ghi đè: phiếu chuyển Đang lệch kèm ghi chú để đối chiếu biên lai.
              </p>
            </div>
          </div>
          <EmptyNote>
            Tổng chênh lệch hiện tại {formatCurrency(totalVariance)} trên{' '}
            {formatNumber(remittances.length)} phiếu. Đối soát chỉ khoá sổ khi số tiền ngân hàng
            khớp đúng số tiền tài xế đã nộp.
          </EmptyNote>
        </EditorialSection>

        <Modal
          isOpen={submitTarget !== null}
          onClose={() => setSubmitTarget(null)}
          title="Nộp tiền quyết toán"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setSubmitTarget(null)}>
                Đóng
              </Button>
              <Button size="sm" onClick={submit} isLoading={saving}>
                Nộp tiền
              </Button>
            </div>
          }
        >
          {submitTarget ? (
            <div className="space-y-3">
              <div className="border border-line p-3 text-[12px] text-ink-soft">
                <div className="flex justify-between">
                  <span>Phiếu</span>
                  <span className="font-mono text-ink">{submitTarget.code}</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span>Tài xế</span>
                  <span className="text-ink">{submitTarget.driverName}</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span>Dự kiến phải thu</span>
                  <span className="tabular-nums text-ink">
                    {formatCurrency(submitTarget.expectedAmount)}
                  </span>
                </div>
              </div>
              <Input
                label="Số tiền thực nộp (₫)"
                type="number"
                min={0}
                step="1000"
                required
                value={submitAmount}
                onChange={(event) => setSubmitAmount(event.target.value)}
              />
              {Number(submitAmount) > 0 &&
              Number(submitAmount) !== submitTarget.expectedAmount ? (
                <p className="border-l-2 border-warning pl-2 text-[12px] text-warning">
                  Chênh lệch{' '}
                  {formatCurrency(Number(submitAmount) - submitTarget.expectedAmount)} so với dự
                  kiến. Phiếu sẽ chuyển sang Đang lệch.
                </p>
              ) : (
                <p className="text-[11px] text-ink-faint">
                  Nộp đúng số dự kiến thì phiếu chuyển Đã nộp, chờ đối soát ngân hàng.
                </p>
              )}
              {actionError ? (
                <p className="border-l-2 border-danger pl-2 text-[12px] text-danger">
                  {actionError}
                </p>
              ) : null}
            </div>
          ) : null}
        </Modal>

        <Modal
          isOpen={reconcileTarget !== null}
          onClose={() => setReconcileTarget(null)}
          title="Đối soát COD"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setReconcileTarget(null)}>
                Đóng
              </Button>
              <Button
                size="sm"
                onClick={reconcile}
                isLoading={saving}
                disabled={!bankId || saving}
              >
                Đối soát
              </Button>
            </div>
          }
        >
          {reconcileTarget ? (
            <div className="space-y-3">
              <div className="border border-line p-3 text-[12px] text-ink-soft">
                <div className="flex justify-between">
                  <span>Phiếu</span>
                  <span className="font-mono text-ink">{reconcileTarget.code}</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span>Đã nộp</span>
                  <span className="tabular-nums text-ink">
                    {formatCurrency(reconcileTarget.submittedAmount)}
                  </span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span>Trạng thái</span>
                  <StatusLabel tone={codStatusTone(reconcileTarget.status)}>
                    {codStatusLabel(reconcileTarget.status)}
                  </StatusLabel>
                </div>
              </div>
              <Select
                label="Giao dịch ngân hàng"
                value={bankId}
                onChange={(event) => setBankId(event.target.value)}
                options={unmatchedBank.map((row) => ({
                  value: row.id,
                  label: `${formatCurrency(row.amount)} · ${formatDateVN(row.txnDate)} · ${
                    row.bankRef
                  }`,
                }))}
                placeholder="Chọn giao dịch chưa khớp"
              />
              <p className="text-[11px] text-ink-faint">
                Giao dịch phải có số tiền đúng bằng số tài xế đã nộp; lệch sẽ bị đánh dấu Đang lệch
                thay vì khoá sổ.
              </p>
              {actionError ? (
                <p className="border-l-2 border-danger pl-2 text-[12px] text-danger">
                  {actionError}
                </p>
              ) : null}
            </div>
          ) : null}
        </Modal>
      </div>
    </RoleGuard>
  );
}
