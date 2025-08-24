"use client";
import { useMemo, useState } from "react";
import ProductImageUploader from "@/components/admin/ProductImageUploader";

type Variant = {
  sku?: string;
  label: string;
  cost?: number | null;
  price?: number | null;
  compareAt?: number | null;
  icon?: string;
  region?: string; // opsional, contoh: ID, SG, etc
  isActive?: boolean;
};

export default function VariantsEditor({
  initialVariants = [],
  fieldName = "variants",
}: {
  initialVariants?: Variant[];
  fieldName?: string;
}) {
  const [rows, setRows] = useState<Variant[]>(() => (Array.isArray(initialVariants) ? initialVariants : []));
  const jsonValue = useMemo(() => JSON.stringify(rows || []), [rows]);

  function addRow() {
    setRows((r) => [...r, { label: "", sku: "", cost: null, price: null, compareAt: null, icon: "", region: "", isActive: true }]);
  }
  function removeRow(idx: number) {
    setRows((r) => r.filter((_, i) => i !== idx));
  }
  function update(idx: number, key: keyof Variant, value: any) {
    setRows((r) => r.map((v, i) => (i === idx ? { ...v, [key]: value } : v)));
  }
  function updatePrice(idx: number, priceVal: number | null) {
    setRows(r => r.map((v,i)=>{
      if (i!==idx) return v;
      const prevAuto = v.price != null && v.compareAt === Math.round((v.price as number) * 1.1);
      const next: Variant = { ...v, price: priceVal };
      if (priceVal != null) {
        const candidate = Math.round(priceVal * 1.1);
        if (v.compareAt == null || prevAuto) {
          next.compareAt = candidate;
        }
      }
      return next;
    }));
  }

  return (
  <div className="mt-4 w-full">
      <input type="hidden" name={fieldName} value={jsonValue} readOnly />
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-slate-900">Varian Topup</h3>
        <button type="button" className="bg-slate-700 text-white px-3 py-1.5 rounded text-sm" onClick={addRow}>Tambah Varian</button>
      </div>
      <div className="rounded border overflow-x-auto w-full">
        <table className="min-w-full w-full table-auto text-sm text-slate-800">
          <thead>
            <tr className="bg-slate-100 text-slate-900 text-left">
              <th className="p-2">Label</th>
              <th className="p-2">SKU</th>
              <th className="p-2">Modal</th>
              <th className="p-2">Harga</th>
              <th className="p-2">Harga Coret</th>
              <th className="p-2">Icon</th>
              <th className="p-2">Region</th>
              <th className="p-2">Aktif</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td className="p-3 text-slate-500" colSpan={9}>Belum ada varian. Klik "Tambah Varian".</td></tr>
            ) : (
              rows.map((v, idx) => (
                <tr key={idx} className="border-t bg-[#fefefe]">
                  <td className="p-2">
                    <input value={v.label || ""} onChange={e => update(idx, "label", e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1 text-slate-900 bg-[#fefefe]" placeholder="Contoh: 86 Diamonds" />
                  </td>
                  <td className="p-2">
                    <input value={v.sku || ""} onChange={e => update(idx, "sku", e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1 text-slate-900 bg-[#fefefe]" placeholder="SKU opsional" />
                  </td>
                  <td className="p-2">
                    <input type="number" min={0} value={v.cost ?? ""} onChange={e => update(idx, "cost", e.target.value === "" ? null : Number(e.target.value))} className="w-full border border-slate-300 rounded px-2 py-1 text-slate-900 bg-[#fefefe]" />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      min={0}
                      value={v.price ?? ""}
                      onChange={e => updatePrice(idx, e.target.value === "" ? null : Number(e.target.value))}
                      className="w-full border border-slate-300 rounded px-2 py-1 text-slate-900 bg-[#fefefe]"
                    />
                    <p className="mt-1 text-[10px] text-slate-500">Harga jual</p>
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      min={0}
                      value={v.compareAt ?? ""}
                      onChange={e => update(idx, "compareAt", e.target.value === "" ? null : Number(e.target.value))}
                      className="w-full border border-slate-300 rounded px-2 py-1 text-slate-900 bg-[#fefefe]"
                      placeholder="Harga sebelum diskon"
                    />
                    <p className="mt-1 text-[10px] text-slate-500">Auto = Harga +10%</p>
                  </td>
                  <td className="p-2">
                    <div className="space-y-2">
                      <input value={v.icon || ""} onChange={e => update(idx, "icon", e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1 text-slate-900 bg-[#fefefe]" placeholder="/images/variants/xxx.png (opsional)" />
                      <div className="mt-1">
                        <ProductImageUploader
                          defaultFolder="variants"
                          defaultName={(v.label || `variant-${idx}`).toString().toLowerCase().replace(/[^a-z0-9]+/g, "-")}
                          onUploadedFieldName={`variant-icon-${idx}`}
                          onUploaded={(url) => update(idx, "icon", url)}
                        />
                        {/* sync hidden input with uploader; uploader writes to this field which we mirror into row.icon via effect-less event */}
                        <input
                          type="hidden"
                          name={`variant-icon-${idx}`}
                          value={v.icon || ""}
                          onChange={(e) => update(idx, "icon", e.target.value)}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="p-2">
                    <input value={v.region || ""} onChange={e => update(idx, "region", e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1 text-slate-900 bg-[#fefefe]" placeholder="Region opsional, contoh: ID" />
                  </td>
                  <td className="p-2">
                    <input type="checkbox" checked={(v.isActive ?? true) !== false} onChange={e => update(idx, "isActive", e.target.checked)} />
                  </td>
                  <td className="p-2 text-right">
                    <button type="button" className="text-red-600" onClick={() => removeRow(idx)}>Hapus</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
