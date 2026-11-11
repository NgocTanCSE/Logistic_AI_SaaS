'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { data } from '@/lib/data';
import {
  EditorialPageHeader,
  EditorialSection,
  MetricBand,
  StatusLabel,
  EmptyNote,
} from 'ui-kit';
import type { EditorialMetric } from 'ui-kit';
import { Button, Input, Modal, Pagination, Select, TableState } from 'ui-components';
import type { InventoryItem, Product } from '@/lib/mock';
import { formatCurrency, formatNumber } from '@/lib/labels';

const PAGE_SIZE = 12;

type ProductForm = {
  id: string | null;
  sku: string;
  name: string;
  barcode: string;
  category: string;
  unit: string;
  weightKg: string;
  volumeCbm: string;
  shelfLifeDays: string;
  reorderPoint: string;
  unitPrice: string;
};

const EMPTY_FORM: ProductForm = {
  id: null,
  sku: '',
  name: '',
  barcode: '',
  category: 'Hàng tiêu dùng',
  unit: 'thùng',
  weightKg: '1',
  volumeCbm: '0.01',
  shelfLifeDays: '',
  reorderPoint: '20',
  unitPrice: '100000',
};

export default function WmsProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [page, setPage] = useState(1);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [productRows, inventoryRows] = await Promise.all([
        data.products.list(),
        data.inventory.list(),
      ]);
      setProducts(productRows);
      setInventory(inventoryRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh mục sản phẩm.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categories = useMemo(
    () => Array.from(new Set(products.map((product) => product.category))).sort(),
    [products],
  );

  const onHandBySku = useMemo(() => {
    const map = new Map<string, { quantity: number; available: number }>();
    inventory.forEach((item) => {
      const current = map.get(item.sku) ?? { quantity: 0, available: 0 };
      map.set(item.sku, {
        quantity: current.quantity + item.quantity,
        available: current.available + item.available,
      });
    });
    return map;
  }, [inventory]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products
      .filter((product) => category === 'ALL' || product.category === category)
      .filter((product) => {
        if (!term) return true;
        return (
          product.sku.toLowerCase().includes(term) ||
          product.name.toLowerCase().includes(term) ||
          product.barcode.includes(term)
        );
      })
      .sort((a, b) => a.sku.localeCompare(b.sku));
  }, [products, category, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const belowReorder = products.filter((product) => {
    const onHand = onHandBySku.get(product.sku)?.available ?? 0;
    return onHand <= product.reorderPoint;
  }).length;

  const withShelfLife = products.filter((product) => (product.shelfLifeDays ?? 0) > 0).length;

  const catalogValue = products.reduce((sum, product) => sum + product.unitPrice, 0);

  const metrics: EditorialMetric[] = [
    { label: 'Mã hàng', value: formatNumber(products.length), meta: `${categories.length} nhóm hàng` },
    {
      label: 'Dưới định mức',
      value: formatNumber(belowReorder),
      meta: 'Cần đặt bổ sung',
      tone: belowReorder > 0 ? 'warning' : 'success',
    },
    {
      label: 'Có hạn sử dụng',
      value: formatNumber(withShelfLife),
      meta: 'Áp dụng FEFO khi cấp phát',
    },
    {
      label: 'Giá trị đơn giá',
      value: formatCurrency(catalogValue),
      meta: 'Tổng đơn giá niêm yết',
    },
  ];

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormError('');
    setOpen(true);
  };

  const openEdit = (product: Product) => {
    setForm({
      id: product.id,
      sku: product.sku,
      name: product.name,
      barcode: product.barcode,
      category: product.category,
      unit: product.unit,
      weightKg: String(product.weightKg),
      volumeCbm: String(product.volumeCbm),
      shelfLifeDays: product.shelfLifeDays === null ? '' : String(product.shelfLifeDays),
      reorderPoint: String(product.reorderPoint),
      unitPrice: String(product.unitPrice),
    });
    setFormError('');
    setOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');
    if (!form.sku.trim() || !form.name.trim()) {
      setFormError('Nhập mã SKU và tên sản phẩm.');
      return;
    }
    const existing = products.find((product) => product.id === form.id);
    const payload = {
      sku: form.sku.trim().toUpperCase(),
      name: form.name.trim(),
      barcode: form.barcode.trim() || form.sku.trim().toUpperCase(),
      category: form.category,
      unit: form.unit,
      weightKg: Number(form.weightKg) || 0,
      volumeCbm: Number(form.volumeCbm) || 0,
      shelfLifeDays: form.shelfLifeDays ? Number(form.shelfLifeDays) : null,
      reorderPoint: Number(form.reorderPoint) || 0,
      unitPrice: Number(form.unitPrice) || 0,
      active: existing ? existing.active : true,
    };
    setSaving(true);
    const duplicate = products.some(
      (product) => product.sku === payload.sku && product.id !== form.id,
    );
    if (duplicate) {
      setFormError('SKU đã tồn tại, dùng mã khác.');
      setSaving(false);
      return;
    }
    try {
      if (form.id) {
        await data.products.update(form.id, payload);
        setNotice(`Đã cập nhật ${payload.sku}.`);
      } else {
        await data.products.create(payload);
        setNotice(`Đã thêm ${payload.sku} vào danh mục.`);
      }
      setOpen(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Không lưu được sản phẩm.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (product: Product) => {
    try {
      await data.products.update(product.id, { active: !product.active });
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Không đổi được trạng thái sản phẩm.');
    }
  };

  return (
    <>
      <EditorialPageHeader
        eyebrow="WMS · Danh mục"
        title="Sản phẩm & định mức tồn"
        description="Danh mục hàng hoá dùng chung cho nhập kho, putaway, wave picking và tính giá trị tồn. Định mức tồn quyết định cảnh báo đặt hàng lại."
        meta={`${filtered.length} / ${products.length} SKU`}
        actions={
          <Button size="sm" onClick={openCreate}>
            Thêm sản phẩm
          </Button>
        }
      />

      <MetricBand metrics={metrics} />

      {notice ? (
        <div className="border-l-2 border-accent bg-surface px-3 py-2 text-[12px] text-ink">
          {notice}
        </div>
      ) : null}

      <EditorialSection
        title="Danh mục sản phẩm"
        eyebrow="SKU"
        action={
          <div className="w-52">
            <Select
              className="h-8"
              aria-label="Lọc theo nhóm hàng"
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setPage(1);
              }}
              options={[
                { value: 'ALL', label: 'Mọi nhóm hàng' },
                ...categories.map((row) => ({ value: row, label: row })),
              ]}
            />
          </div>
        }
      >
        <div className="mb-3">
          <Input
            type="search"
            placeholder="Tìm SKU, tên hàng, barcode"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            className="h-9 w-72"
          />
        </div>

        <div className="overflow-x-auto border border-line">
          <table className="min-w-full divide-y divide-line">
            <thead className="bg-surface-alt">
              <tr>
                {[
                  'SKU',
                  'Tên hàng',
                  'Nhóm',
                  'Đơn vị',
                  'Kg',
                  'm³',
                  'Hạn dùng',
                  'Định mức',
                  'Khả dụng',
                  'Đơn giá',
                  'Trạng thái',
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
                empty={!loading && paged.length === 0}
                error={error ? new Error(error) : undefined}
                onRetry={load}
                colSpan={12}
                emptyTitle="Không có sản phẩm"
                emptyDescription="Thêm sản phẩm đầu tiên để bắt đầu nhập kho."
              >
                {paged.map((product) => {
                  const available = onHandBySku.get(product.sku)?.available ?? 0;
                  const low = available <= product.reorderPoint;
                  return (
                    <tr key={product.id} className="hover:bg-surface-alt">
                      <td className="px-3 py-2 font-mono text-[11px] font-medium text-ink">
                        {product.sku}
                      </td>
                      <td className="px-3 py-2 text-ink-soft">{product.name}</td>
                      <td className="px-3 py-2 text-ink-faint">{product.category}</td>
                      <td className="px-3 py-2 text-ink-soft">{product.unit}</td>
                      <td className="px-3 py-2 tabular-nums text-ink-soft">{product.weightKg}</td>
                      <td className="px-3 py-2 tabular-nums text-ink-soft">{product.volumeCbm}</td>
                      <td className="px-3 py-2 tabular-nums text-ink-soft">
                        {product.shelfLifeDays ? `${product.shelfLifeDays} ngày` : '—'}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-ink-soft">
                        {formatNumber(product.reorderPoint)}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        <span className={low ? 'font-semibold text-warning' : 'text-ink'}>
                          {formatNumber(available)}
                        </span>
                      </td>
                      <td className="px-3 py-2 tabular-nums text-ink">
                        {formatCurrency(product.unitPrice)}
                      </td>
                      <td className="px-3 py-2">
                        <StatusLabel tone={product.active ? 'success' : 'neutral'}>
                          {product.active ? 'Đang dùng' : 'Ngừng dùng'}
                        </StatusLabel>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <div className="flex items-center gap-3 text-[11px]">
                          <button
                            type="button"
                            className="font-semibold text-ink-soft hover:text-accent"
                            onClick={() => openEdit(product)}
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            className="font-semibold text-ink-soft hover:text-accent"
                            onClick={() => toggleActive(product)}
                          >
                            {product.active ? 'Ngừng' : 'Bật'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </TableState>
            </tbody>
          </table>
        </div>

        {filtered.length > PAGE_SIZE ? (
          <div className="flex justify-center py-3">
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
          </div>
        ) : (
          <EmptyNote>
            Mọi thay đổi ở đây áp dụng ngay cho nhập kho, putaway và wave picking.
          </EmptyNote>
        )}
      </EditorialSection>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={form.id ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
        size="full"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Đóng
            </Button>
            <Button size="sm" type="submit" form="product-form" isLoading={saving}>
              {form.id ? 'Lưu thay đổi' : 'Thêm sản phẩm'}
            </Button>
          </div>
        }
      >
        <form id="product-form" onSubmit={submit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="SKU"
              required
              value={form.sku}
              onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value }))}
              placeholder="SKU-0042"
              disabled={Boolean(form.id)}
            />
            <Input
              label="Tên hàng"
              required
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Nước mắm cá cơm 500ml"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              label="Barcode"
              value={form.barcode}
              onChange={(event) =>
                setForm((current) => ({ ...current, barcode: event.target.value }))
              }
              placeholder="Để trống sẽ dùng SKU"
            />
            <Input
              label="Nhóm hàng"
              value={form.category}
              onChange={(event) =>
                setForm((current) => ({ ...current, category: event.target.value }))
              }
            />
            <Input
              label="Đơn vị"
              value={form.unit}
              onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))}
              placeholder="thùng"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Input
              label="Khối lượng (kg)"
              type="number"
              min={0}
              step="0.01"
              value={form.weightKg}
              onChange={(event) =>
                setForm((current) => ({ ...current, weightKg: event.target.value }))
              }
            />
            <Input
              label="Thể tích (m³)"
              type="number"
              min={0}
              step="0.001"
              value={form.volumeCbm}
              onChange={(event) =>
                setForm((current) => ({ ...current, volumeCbm: event.target.value }))
              }
            />
            <Input
              label="Hạn dùng (ngày)"
              type="number"
              min={0}
              value={form.shelfLifeDays}
              onChange={(event) =>
                setForm((current) => ({ ...current, shelfLifeDays: event.target.value }))
              }
              placeholder="Trống = không hạn"
            />
            <Input
              label="Định mức tồn"
              type="number"
              min={0}
              value={form.reorderPoint}
              onChange={(event) =>
                setForm((current) => ({ ...current, reorderPoint: event.target.value }))
              }
            />
            <Input
              label="Đơn giá (₫)"
              type="number"
              min={0}
              step="1000"
              value={form.unitPrice}
              onChange={(event) =>
                setForm((current) => ({ ...current, unitPrice: event.target.value }))
              }
            />
          </div>
          {formError ? (
            <p className="border-l-2 border-danger pl-2 text-[12px] text-danger">{formError}</p>
          ) : (
            <EmptyNote>
              Sản phẩm có hạn dùng sẽ được cấp phát theo FEFO; sản phẩm không hạn dùng mặc định
              FIFO.
            </EmptyNote>
          )}
        </form>
      </Modal>
    </>
  );
}
