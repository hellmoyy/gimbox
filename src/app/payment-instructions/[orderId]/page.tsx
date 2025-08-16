"use client";
import { useEffect, useMemo, useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";

function formatRupiah(n?: number) {
  if (typeof n !== "number") return "Rp 0";
  try { return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n); }
  catch { return `Rp ${n.toLocaleString("id-ID")}`; }
}

function normalizeMethod(method?: string) {
  const m = String(method || "").toLowerCase();
  if (m.includes("qris") || /\bqr\b/.test(m)) return "qris";
  // Bank transfer synonyms: rekening/rek, tf, bank names
  if (
  (m.includes("bank") && m.includes("transfer")) ||
  /\btransfer\b/.test(m) ||
  /\brekening\b|\brek\b|\btf\b|\bbca\b|\bbni\b|\bbri\b|\bmandiri\b/.test(m)
  ) return "bank_transfer";
  if (m.includes("va") || m.includes("virtual account") || m.includes("virtual_account")) return "va";
  if (m.includes("emoney") || m.includes("e-money") || m.includes("ovo") || m.includes("gopay") || m.includes("dana") || m.includes("shopee")) return "emoney";
  return m || "other";
}

function computeUniqueAmount(base?: number, orderId?: string) {
  const amount = typeof base === "number" ? base : 0;
  if (!orderId) return { amountWithCode: amount, code: 0 };
  const digits = orderId.replace(/\D/g, "");
  let code = digits.slice(-3);
  if (!code) {
    let sum = 0;
    for (let i = 0; i < orderId.length; i++) sum = (sum + orderId.charCodeAt(i)) % 1000;
    code = String(sum).padStart(3, "0");
  }
  if (code === "000") code = "321"; // avoid 000
  const codeNum = Number(code);
  return { amountWithCode: amount + codeNum, code: codeNum };
}

// Very simple dummy QR generator (SVG data URL) for demo purposes
function buildDummyQrDataUrl(text: string) {
  const size = 184;
  const bg = "#ffffff";
  const fg = "#000000";
  // simple pattern based on char codes
  let rects = "";
  for (let y = 0; y < 21; y++) {
    for (let x = 0; x < 21; x++) {
      const idx = (x + 1) * (y + 3) + text.charCodeAt((x * y) % text.length || 0);
      if ((idx % 3) === 0) {
        rects += `<rect x="${x * 8}" y="${y * 8}" width="8" height="8" fill="${fg}"/>`;
      }
    }
  }
  const svg = `<?xml version='1.0' encoding='UTF-8'?>
  <svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 168 168'>
    <rect width='100%' height='100%' fill='${bg}'/>
    ${rects}
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const BANK_INFO = { name: "BCA", accountNumber: "5775458264", accountHolder: "Helmi Andito Purnama" } as const;

export default function PaymentInstructionsPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = usePromise(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState<any>(null);
  const [error, setError] = useState("");
  const [poll, setPoll] = useState(true);
  const [intentMethod, setIntentMethod] = useState<string>("");

  async function load() {
    setError("");
    try {
      const res = await fetch(`/api/transactions/pay?orderId=${encodeURIComponent(orderId)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.error || "Gagal mengambil data pembayaran");
      setPayment(data);
    } catch (e: any) {
      setError(e?.message || "Gagal mengambil data pembayaran");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { setLoading(true); load(); }, [orderId]);
  useEffect(() => {
    try {
      const search = typeof window !== 'undefined' ? window.location.search : '';
      const m = new URLSearchParams(search).get('m') || '';
      if (m) setIntentMethod(m.toLowerCase());
    } catch {}
  }, []);

  // Auto-poll while pending (every 10s)
  useEffect(() => {
    if (!poll) return;
    if (payment?.status !== "pending") return;
    const t = setInterval(() => load(), 10000);
    return () => clearInterval(t);
  }, [payment?.status, poll]);

  const methodNorm = useMemo(() => {
    const intent = normalizeMethod(intentMethod);
    const fromPayment = normalizeMethod(payment?.method);
    // Priority: transfer > qris > va > emoney
    if (intent === 'transfer') return 'bank_transfer';
    if (intent === 'qris') return 'qris';
    if (intent && intent !== 'other') return intent;
    return fromPayment;
  }, [payment?.method, intentMethod]);
  const icon = useMemo(() => {
    const method = String(methodNorm || "");
    if (method === "qris") return "/images/iconpayment/qris.png";
    if (method === "bank_transfer") return "/images/iconpayment/bank.png";
    if (method === "va") return "/images/iconpayment/va.png";
    if (method === "emoney") return "/images/iconpayment/emoney.png";
    return "/images/iconpayment/bank.png";
  }, [methodNorm]);

  const methodLabel = useMemo(() => {
    if (methodNorm === 'bank_transfer') return 'Transfer Bank (BCA)';
    if (methodNorm === 'qris') return 'QRIS';
    if (methodNorm === 'va') return 'Virtual Account';
    if (methodNorm === 'emoney') return 'E-Money';
    return String(payment?.method || '-').toUpperCase();
  }, [methodNorm, payment?.method]);

  // Always compute unique amount hook before any conditional returns to preserve hook order
  const { amountWithCode, code } = useMemo(() => computeUniqueAmount(payment?.amount, orderId), [payment?.amount, orderId]);

  if (loading) {
    return (
      <main className="min-h-screen pb-24">
        <div className="mx-auto max-w-md px-4 pt-6">
          <div className="rounded-xl border border-slate-200 bg-[#fefefe] p-5">
            <div className="h-5 w-40 bg-slate-100 rounded mb-3" />
            <div className="h-6 w-28 bg-slate-100 rounded mb-2" />
            <div className="h-16 w-full bg-slate-100 rounded" />
          </div>
        </div>
      </main>
    );
  }
  if (error) {
    return (
      <main className="min-h-screen pb-24">
        <div className="mx-auto max-w-md px-4 pt-6">
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700 text-sm">{error}</div>
        </div>
      </main>
    );
  }
  if (!payment) return null;

  const isSuccess = payment.status === "paid" || payment.status === "success";
  const isPending = payment.status === "pending";

  return (
    <main className="min-h-screen pb-24">
      <div className="mx-auto max-w-md px-4 pt-6">
        {/* Header */}
        <div className="mb-3">
          <h1 className="text-xl font-semibold text-slate-900">Instruksi Pembayaran</h1>
          <div className="text-xs text-slate-500">Order ID: {orderId}</div>
        </div>

        {/* Status banner */}
        {isSuccess ? (
          <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-green-700 text-sm">Pembayaran berhasil. Terima kasih!</div>
        ) : isPending ? (
          <div className="mb-3 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-yellow-700 text-sm">Menunggu pembayaran. Ikuti instruksi di bawah ini.</div>
        ) : null}

        {/* Rincian Card (moved above payment card) */}
        <div className="rounded-xl border border-slate-200 bg-[#fefefe] overflow-hidden mb-3">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900">
              Rincian{payment.productLabel ? ` • ${payment.productLabel}` : ''}{payment.variantLabel ? ` • ${payment.variantLabel}` : ''}
            </div>
          </div>
          <div className="p-4">
            <div className="text-sm text-slate-700 flex items-center justify-between">
              <span>Belanja</span>
              <span className="font-semibold">{formatRupiah(Number(payment.baseAmount ?? 0) || 0)}</span>
            </div>
            <div className="text-sm text-slate-700 flex items-center justify-between mt-1">
              <span>Fee</span>
              <span className="font-semibold">{methodNorm === 'bank_transfer' ? String(Number(payment.feePercent ?? 0)) : `${(Number(payment.feePercent ?? 0)).toFixed(1)}%`}</span>
            </div>
            {methodNorm === 'bank_transfer' && (
              <div className="text-sm text-slate-700 flex items-center justify-between mt-1">
                <span>Kode unik</span>
                <span className="font-semibold">{String(code).padStart(3, '0')}</span>
              </div>
            )}
            <div className="text-sm text-slate-900 flex items-center justify-between mt-2 border-t border-slate-200 pt-2">
              <span className="font-semibold">Total</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#0d6efd]">{methodNorm === 'bank_transfer' ? formatRupiah(amountWithCode) : formatRupiah(Number(payment.amount ?? 0) || 0)}</span>
                <CopyButton text={`${methodNorm === 'bank_transfer' ? amountWithCode : (Number(payment.amount ?? 0) || 0)}`} />
              </div>
            </div>
          </div>
        </div>

        {/* Payment Card */}
        <div className="rounded-xl border border-slate-200 bg-[#fefefe] overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={icon} alt="metode" className="w-8 h-8 object-contain" />
              <div className="text-sm">
                <div className="font-semibold text-slate-900">Metode: <span className="text-[#0d6efd]">{methodLabel}</span></div>
                <div className="text-xs text-slate-500">Jumlah: <span className="font-semibold text-slate-900">{formatRupiah(payment.amount)}</span></div>
              </div>
            </div>
            {isPending && (
              <button onClick={() => load()} className="text-xs px-2 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-50">Periksa status</button>
            )}
          </div>

          <div className="p-4">
            {isSuccess ? (
              <div className="text-center py-6">
                <div className="text-2xl">✅</div>
                <div className="mt-2 text-slate-800">Pembayaran Anda sudah diterima.</div>
              </div>
            ) : (
              <>
                {/* Bank Transfer with unique code (Moota) */}
                {methodNorm === "bank_transfer" && (
                  <div className="space-y-2">
                    <InfoRow label="Bank" value={BANK_INFO.name} />
                    <InfoRow label="Atas Nama" value={BANK_INFO.accountHolder} />
                    <InfoRow label="No. Rekening" value={BANK_INFO.accountNumber} copy />
                    <InfoRow label="Nominal (dengan kode unik)" value={formatRupiah(amountWithCode)} copy />
                    <div className="mt-1 text-[11px] text-slate-500">Kode unik: {String(code).padStart(3, "0")} • Gunakan nominal di atas agar verifikasi otomatis oleh Moota.</div>
                  </div>
                )}

                {/* QRIS */}
        {methodNorm === "qris" && (
                  <div className="text-center">
                    <div className="mb-2 text-sm text-slate-700">Scan QR untuk membayar:</div>
                    <div className="inline-flex p-2 rounded-lg border border-slate-200 bg-white">
                      <img
                        src={payment.qrCodeUrl || buildDummyQrDataUrl(`${orderId}-${amountWithCode}`)}
                        alt="QR Code"
                        className="w-44 h-44 object-contain"
                      />
                    </div>
          <div className="mt-2 text-sm text-slate-700">Nominal: <span className="font-semibold text-slate-900">{formatRupiah(payment.amount)}</span></div>
                  </div>
                )}

                {/* E-money */}
                {methodNorm === "emoney" && (
                  <div>
                    <div className="text-sm text-slate-700">Bayar menggunakan dompet digital:</div>
                    <ul className="mt-2 grid grid-cols-2 gap-2 text-sm text-slate-800">
                      <WalletItem name="Dana" src="/images/iconpayment/emoney/dana.png" />
                      <WalletItem name="OVO" src="/images/iconpayment/emoney/ovo.png" />
                      <WalletItem name="GoPay" src="/images/iconpayment/emoney/gopay.png" />
                      <WalletItem name="ShopeePay" src="/images/iconpayment/emoney/shopeepay.png" />
                    </ul>
          <div className="mt-3 text-sm text-slate-700 flex items-center justify-between">
                      <span>Nominal</span>
                      <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">{formatRupiah(payment.amount)}</span>
                        <CopyButton text={`${Number(payment.amount ?? 0) || 0}`} />
                      </div>
                    </div>
                    <div className="mt-2 text-[11px] text-slate-500">Buka aplikasi dompet pilihanmu dan bayar sesuai nominal.</div>
                  </div>
                )}

                {/* Virtual Account list (dummy) */}
                {methodNorm === "va" && (
                  <div className="space-y-2">
                    <InfoRow label="VA BCA" value="32093023923920" copy />
                    <InfoRow label="VA BNI" value="43948394834893" copy />
                    <InfoRow label="VA BRI" value="43948394834893" copy />
                    <InfoRow label="VA Mandiri" value="43948394834893" copy />
                    <div className="text-[11px] text-slate-500">Bayar sesuai virtual account bank pilihan Anda.</div>
                  </div>
                )}

                {/* Generic fallback */}
                {!["bank_transfer", "emoney", "qris", "va"].includes(String(methodNorm)) && (
                  <div className="space-y-2">
                    <InfoRow label="Nominal" value={formatRupiah(payment.amount)} copy />
                    <div className="text-xs text-slate-500">Ikuti instruksi sesuai metode yang dipilih.</div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
            <a href="/" className="text-xs px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50">Beranda</a>
            <a href="/transactions" className="text-xs px-3 py-1.5 rounded bg-[#0d6efd] text-white">Lihat Transaksi</a>
          </div>
        </div>
      </div>
    </main>
  );
}

function InfoRow({ label, value, copy }: { label: string; value: string; copy?: boolean }) {
  async function doCopy() {
    try { await navigator.clipboard.writeText(value.replace(/^Nominal:\s*/i, "")); } catch {}
  }
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
      <div>
        <div className="text-[11px] text-slate-500">{label}</div>
        <div className="text-sm font-semibold text-slate-900">{value}</div>
      </div>
      {copy && (
        <button type="button" onClick={doCopy} className="text-xs px-2 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-50">Salin</button>
      )}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  async function doCopy() {
    try { await navigator.clipboard.writeText(text); } catch {}
  }
  return (
    <button type="button" onClick={doCopy} className="text-[11px] px-2 py-0.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50">Salin</button>
  );
}

function WalletItem({ name, src }: { name: string; src: string }) {
  return (
    <li className="rounded border border-slate-200 px-3 py-2 bg-white flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={name}
        className="w-6 h-6 object-contain"
        onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/images/iconpayment/emoney.png"; }}
      />
      <span>{name}</span>
    </li>
  );
}
