"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSession, signIn } from "next-auth/react";

// Note: using any for unknown variant additions (region) to avoid breaking existing typing
export type Variant = {
  label: string;
  price?: number | null;
  compareAt?: number | null;
  icon?: string;
  isActive?: boolean;
  // region is optional and may come from admin
  region?: string | null;
};

export default function TopupForm({ code, price, variants, hidePaymentMethods }: { code: string; price: number; variants?: Variant[]; hidePaymentMethods?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  // Controlled MLBB inputs to enable numeric enforcement & auto-check
  const [userIdInput, setUserIdInput] = useState<string>("");
  const [serverIdInput, setServerIdInput] = useState<string>("");
  const [validatedName, setValidatedName] = useState<string>("");
  const [validatedRegion, setValidatedRegion] = useState<string>("");
  // Dedicated validation feedback shown under the format line for MLBB only
  const [validation, setValidation] = useState<{ ok: boolean; text: string } | null>(null);
  const [message, setMessage] = useState("");
  const [snapToken, setSnapToken] = useState("");
  const [snapUrl, setSnapUrl] = useState("");
  const [midtransClientKey, setMidtransClientKey] = useState<string>("");
  const [gateways, setGateways] = useState<Array<{ name: string; enabled: boolean; methods: string[] }>>([]);
  const [selectedGateway, setSelectedGateway] = useState<string>("midtrans");
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [showMethodModal, setShowMethodModal] = useState(false);
  const [activePaymentsUI, setActivePaymentsUI] = useState<Array<{ id: string; label: string; gateway: string; method: string; logoUrl?: string; enabled?: boolean; sort?: number; feeType?: 'flat'|'percent'; feeValue?: number }>>([]);
  const [useGimcash, setUseGimcash] = useState(false);
  const [showTopupInput, setShowTopupInput] = useState(false);
  const [topupAmount, setTopupAmount] = useState<number | ''>('');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [methodFees, setMethodFees] = useState<Record<string, number>>({});
  const lastChosenKindRef = useRef<'qris' | 'emoney' | 'va' | 'transfer' | ''>('');
  const formRef = useRef<HTMLFormElement | null>(null);
  const [showPageLoading, setShowPageLoading] = useState(false);

  // Derive current gateway fee based on Active Payments config; fallback to methodFees map
  const computeGatewayFee = (base: number) => {
    const ap = activePaymentsUI.find((it) => it && it.enabled !== false && it.gateway === selectedGateway && it.method === selectedMethod);
    if (ap) {
      const feeType = ap.feeType === 'percent' ? 'percent' : 'flat';
      const feeValue = typeof ap.feeValue === 'number' ? ap.feeValue : Number(ap.feeValue || 0) || 0;
      return feeType === 'percent' ? Math.round(base * (feeValue / 100)) : Math.round(feeValue);
    }
    const fallback = Number(methodFees[selectedMethod] || 0);
    return isFinite(fallback) ? Math.round(fallback) : 0;
  };

  const activeVariantsAll = useMemo(() => (variants || []).filter(v => (v.isActive ?? true) !== false), [variants]);
  const activeVariants = useMemo(() => {
    // Only apply region filtering for MLBB post-validation
    if (code !== 'mlbb') return activeVariantsAll;
    const hasValidated = Boolean(validatedName);
    const regionCode = (validatedRegion || '').trim().toUpperCase();
    if (!hasValidated) {
      // Before validation, show all active variants (browse)
      return activeVariantsAll;
    }
    if (regionCode) {
      // After validation with region: only region match or 'ALL'
      return activeVariantsAll.filter((v: any) => {
        const r = (v.region || '').trim().toUpperCase();
        return r === regionCode || r === 'ALL';
      });
    }
    // After validation without region: only 'ALL'
    return activeVariantsAll.filter((v: any) => (v.region || '').trim().toUpperCase() === 'ALL');
  }, [activeVariantsAll, code, validatedName, validatedRegion]);

  // Find the cheapest by price (ignore nulls), fallback to index 0
  const cheapestIndex = useMemo(() => {
    if (!activeVariants.length) return -1;
    let idx = -1;
    let min = Number.POSITIVE_INFINITY;
    activeVariants.forEach((v, i) => {
      if (v.price != null && v.price < min) {
        min = v.price;
        idx = i;
      }
    });
    return idx >= 0 ? idx : 0;
  }, [activeVariants]);

  // Default select cheapest so checkout is ready; when no variants, default to base price
  const [selectedIndex, setSelectedIndex] = useState<number>(activeVariants.length ? cheapestIndex : 0);
  const [selectedPrice, setSelectedPrice] = useState<number | null>(activeVariants.length ? (activeVariants[cheapestIndex]?.price ?? null) : price);
  useEffect(() => {
    if (!activeVariants.length) {
      setSelectedIndex(0);
      setSelectedPrice(price);
      return;
    }
    if (selectedIndex < 0 || selectedIndex >= activeVariants.length) {
      setSelectedIndex(cheapestIndex);
      setSelectedPrice(activeVariants[cheapestIndex]?.price ?? null);
    }
  }, [activeVariants, cheapestIndex, price, selectedIndex]);

  const [showVariantsModal, setShowVariantsModal] = useState(false);
  const { data: session } = useSession();
  const sessionEmail = (session as any)?.user?.email as string | undefined;
  const [showLogin, setShowLogin] = useState(false);

  // Restore MLBB draft (userId/serverId) after login redirect
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      if (code !== 'mlbb') return;
      const key = `topup:draft:${code}`;
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const data = JSON.parse(raw || '{}');
        if (typeof data?.userId === 'string') setUserIdInput(String(data.userId));
        if (typeof data?.serverId === 'string') setServerIdInput(String(data.serverId));
        sessionStorage.removeItem(key);
      }
    } catch {}
  // run only once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Load available gateways for user selection
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/gateways/available', { cache: 'no-store' });
        const j = await res.json();
        const list: Array<{ name: string; enabled: boolean; methods: string[] }> = Array.isArray(j?.data) ? j.data : [];
        const enabledList = list.filter((g) => g.enabled);
        setGateways(enabledList);
  // Load ordered Active Payments from API response
  const aps: Array<any> = Array.isArray(j?.activePayments) ? j.activePayments : [];
  setActivePaymentsUI(aps);
        // Prefer default from Active Payments if available; fallback to first enabled gateway method
        if (aps.length > 0) {
          setSelectedGateway(aps[0].gateway);
          setSelectedMethod(aps[0].method);
        } else if (enabledList.length) {
          setSelectedGateway(enabledList[0].name);
          setSelectedMethod(enabledList[0].methods?.[0] || "");
        }
        // Also fetch method fees
        try {
          const rf = await fetch('/api/gateways/fees', { cache: 'no-store' });
          const jf = await rf.json();
          if (jf?.success && jf?.fees && typeof jf.fees === 'object') setMethodFees(jf.fees);
        } catch {}
      } catch {}
    })();
  }, []);

  // Load wallet balance when method modal opens
  useEffect(() => {
    let ignore = false;
    async function loadBalance() {
      try {
        const res = await fetch('/api/wallet/me', { cache: 'no-store' });
        const j = await res.json();
        if (!ignore) setWalletBalance(typeof j?.balance === 'number' ? j.balance : 0);
      } catch {
        if (!ignore) setWalletBalance(0);
      }
    }
    if (showMethodModal && sessionEmail) loadBalance();
    return () => { ignore = true; };
  }, [showMethodModal, sessionEmail]);

  function beginPayment() {
    // If not logged in, show login prompt
    if (!sessionEmail) {
      // Persist current MLBB inputs so they survive the OAuth redirect
      try {
        if (typeof window !== 'undefined' && code === 'mlbb') {
          const key = `topup:draft:${code}`;
          sessionStorage.setItem(key, JSON.stringify({ userId: userIdInput, serverId: serverIdInput, ts: Date.now() }));
        }
      } catch {}
      setShowLogin(true);
      return;
    }
  // Just submit; overlay is handled in onSubmit after validation passes
  formRef.current?.requestSubmit();
  }

  function methodToKind(method: string): 'qris' | 'emoney' | 'va' | 'transfer' {
    const m = (method || '').toLowerCase();
    if (m === 'qris') return 'qris';
    if (m === 'bank_transfer') return 'transfer';
    if (m.startsWith('va_')) return 'va';
    if (['gopay', 'shopeepay', 'ovo', 'dana', 'linkaja'].includes(m)) return 'emoney';
    return 'va';
  }

  function chooseActivePayment(item: { gateway: string; method: string }) {
    const kind = methodToKind(item.method);
    lastChosenKindRef.current = kind;
    setSelectedGateway(item.gateway);
    setSelectedMethod(item.method);
    setShowMethodModal(false);
  }

  // removed sub-VA chooser; Midtrans UI will present bank choices

  // Auto-check helpers: debounce, abort, cache, throttle (2s between successes)
  const debounceRef = useMemo(() => ({ t: 0 as any }), []);
  const abortRef = useMemo(() => ({ c: null as AbortController | null }), []);
  const cacheRef = useMemo(() => new Map<string, { ok: boolean; username?: string; region?: string; ts: number }>(), []);
  const lastSuccessAtRef = useMemo(() => ({ ts: 0 }), []);
  const onlyDigits = (v: string) => v.replace(/\D+/g, "");

  async function loadMidtransSnap(clientKey: string, sandbox: boolean) {
    if (!clientKey) throw new Error("Missing Midtrans client key");
    // If already loaded, return
    if (typeof window !== "undefined" && (window as any).snap) return;
    const scriptId = "midtrans-snap-script";
    if (document.getElementById(scriptId)) return;
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.id = scriptId;
      s.src = sandbox
        ? "https://app.sandbox.midtrans.com/snap/snap.js"
        : "https://app.midtrans.com/snap/snap.js";
      s.setAttribute("data-client-key", clientKey);
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load Midtrans Snap"));
      document.body.appendChild(s);
    });
  }

  // Auto-check effect for MLBB (debounced + throttled + abortable + cached)
  useEffect(() => {
    if (code !== 'mlbb') return;
    // reset previous debounce
    if (debounceRef.t) clearTimeout(debounceRef.t);

    const uid = userIdInput.trim();
    const sid = serverIdInput.trim();
    // If either empty, or below minimum lengths, do not show errors; just clear state
    if (!uid || !sid || uid.length < 8 || sid.length < 4) {
      setChecking(false);
      setValidation(null);
      return;
    }
    // At this point, both satisfy minimums. Max lengths are enforced by inputs.

    const elapsed = Date.now() - lastSuccessAtRef.ts;
    const baseDelay = 800;
    const extraDelay = elapsed < 2000 ? (2000 - elapsed) : 0;
    const delay = Math.max(baseDelay, extraDelay);
    setChecking(true);

    debounceRef.t = setTimeout(async () => {
      const key = `${uid}:${sid}`;
      const now = Date.now();
      const cached = cacheRef.get(key);
      if (cached && now - cached.ts < 5 * 60 * 1000) {
        if (cached.ok && cached.username) {
          setValidatedName(cached.username);
          setValidatedRegion(cached.region || "");
          setValidation({ ok: true, text: `Valid! Username : ${cached.username} | Region : ${cached.region || '?'}` });
        } else {
          setValidatedName("");
          setValidatedRegion("");
          setValidation({ ok: false, text: 'Username tidak valid' });
        }
        setChecking(false);
        return;
      }

      // Abort previous
      abortRef.c?.abort();
      const controller = new AbortController();
      abortRef.c = controller;
      try {
        const res = await fetch('/api/validate/mlbb', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: uid, serverId: sid }),
          signal: controller.signal,
        });
        const j = await res.json();
        const nameStr = (j?.username ?? '').toString().trim();
        if (j?.ok && nameStr) {
          setValidatedName(nameStr);
          setValidatedRegion(j.region || '');
          setValidation({ ok: true, text: `Valid! Username : ${nameStr} | Region : ${j.region || '?'}` });
          lastSuccessAtRef.ts = Date.now();
          cacheRef.set(key, { ok: true, username: nameStr, region: j.region, ts: Date.now() });
        } else {
          setValidatedName('');
          setValidatedRegion('');
          setValidation({ ok: false, text: j?.error || 'Username tidak valid' });
          cacheRef.set(key, { ok: false, ts: Date.now() });
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return; // cancelled; let next effect handle
        setValidation({ ok: false, text: err?.message || 'Terjadi kesalahan saat cek ID' });
      } finally {
        setChecking(false);
      }
    }, delay);

    return () => {
      if (debounceRef.t) clearTimeout(debounceRef.t);
    };
  }, [code, userIdInput, serverIdInput, cacheRef, debounceRef, lastSuccessAtRef, abortRef]);

  async function handleSubmit(e: any) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setSnapToken("");

  const form = e.target as HTMLFormElement & { userId?: { value: string }; serverId?: { value: string }; nominal: { value: string } };

    // For MLBB, ensure validatedName exists or perform a quick check inline
    if (code === "mlbb") {
      try {
        const uid = userIdInput.trim();
        const sid = serverIdInput.trim();
        const uidOk = uid.length >= 8 && uid.length <= 12;
        const sidOk = sid.length >= 4 && sid.length <= 5;
        if (!uidOk || !sidOk) {
          setLoading(false);
          setValidation({ ok: false, text: 'Format ID tidak valid' });
          setShowPageLoading(false);
          return;
        }
        if (uid && sid && !validatedName) {
          const res = await fetch("/api/validate/mlbb", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: uid, serverId: sid }),
          });
          const j = await res.json();
          const nameStr = (j?.username ?? "").toString().trim();
          if (!j?.ok || !nameStr) {
            setLoading(false);
            setValidatedName("");
            setValidatedRegion("");
            setValidation({ ok: false, text: j?.error || "Username tidak valid" });
            setShowPageLoading(false);
            return;
          }
          if (j?.username) setValidatedName(j.username);
          if (j?.region) setValidatedRegion(j.region);
          const u = nameStr;
          const r = j.region || "?";
          setValidation({ ok: true, text: `Valid! Username : ${u} | Region : ${r}` });
        }
      } catch {
        setLoading(false);
        setValidation({ ok: false, text: "Gagal memeriksa User ID, coba lagi." });
        setShowPageLoading(false);
        return;
      }
    }

    // If not logged in, ask to login with Google first
    if (!sessionEmail) {
      setLoading(false);
      setShowLogin(true);
  setShowPageLoading(false);
      return;
    }

    // Combine MLBB userId + serverId for backend single field, if provided
  const inputUserId = userIdInput || "";
  const serverId = serverIdInput || "";
    const combinedUserId = serverId && code === "mlbb" ? `${inputUserId}(${serverId})` : inputUserId;

  const chosenVariant = activeVariants[selectedIndex] || activeVariants[cheapestIndex] || null;
  const base = (selectedPrice ?? 0);
  const gwFee = computeGatewayFee(base);
  const data: any = {
      code,
      userId: combinedUserId,
      email: sessionEmail,
      nominal: form.nominal.value,
  // Include gateway fee into final price for all gateways
  price: base + gwFee,
  // Pass through fee breakdown for storage/analysis
  gatewayFee: gwFee,
      productCode: code,
      productLabel: code,
      variantLabel: chosenVariant?.label || null,
      variantPrice: typeof chosenVariant?.price === 'number' ? chosenVariant?.price : price,
    };
  if (selectedGateway) data.gateway = selectedGateway;
  if (selectedMethod) data.method = selectedMethod;

    let result: any = {};
    try {
      setShowPageLoading(true);
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      result = await res.json();
    } catch (err) {
      setShowPageLoading(false);
      setLoading(false);
      setMessage("Gagal membuat order. Coba lagi.");
      return;
    }
    setLoading(false);
    // Don't show success banner; only show errors when they occur
    if (!result?.orderId && result?.message && result?.success === false) {
      setMessage(result.message);
    } else {
      setMessage("");
    }
    if (result.snapToken) setSnapToken(result.snapToken);
    if (result.snapRedirectUrl) setSnapUrl(result.snapRedirectUrl);
    if (result.midtransClientKey) setMidtransClientKey(result.midtransClientKey);

    // Always route user to our instruction page to complete payment
    if (result?.orderId) {
  const chosen = lastChosenKindRef.current;
  const q = chosen ? `?m=${encodeURIComponent(chosen)}` : '';
      window.location.href = `/payment-instructions/${encodeURIComponent(result.orderId)}${q}`;
      return;
    }
  // When not redirecting, hide overlay
  setShowPageLoading(false);

    // Midtrans Snap popup integration (preferred over redirect)
  if (false && result.snapToken && selectedGateway === "midtrans") {
      const redirectUrl: string = result.snapRedirectUrl || "";
      const isSandbox = redirectUrl.includes("app.sandbox.midtrans.com");
      try {
        await loadMidtransSnap(result.midtransClientKey || "", isSandbox);
        const snap: any = (window as any).snap;
        if (snap && typeof snap.pay === "function") {
          snap.pay(result.snapToken, {
            onSuccess: () => { /* optional: show success message; webhook will finalize */ },
            onPending: () => { /* optional */ },
            onError: () => { /* optional */ },
            onClose: () => { /* optional */ },
          });
          return;
        }
      } catch {
        // fall through to redirect if popup fails to init
      }
      if (redirectUrl) {
        window.location.href = redirectUrl;
      }
    }
  }

  return (
  <form ref={formRef} className="bg-[#fefefe] rounded-xl border border-slate-200 shadow p-5 flex flex-col gap-4" onSubmit={handleSubmit}>
      {/* Game ID input */}
      {code === "mlbb" ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700">User ID</label>
            <input
              type="text"
              name="userId"
              placeholder="contoh: 12345678"
              className="mt-1 w-full border border-slate-300 rounded px-3 py-2 bg-white text-slate-900 placeholder:text-slate-600"
              required
              inputMode="numeric"
              maxLength={12}
              value={userIdInput}
              onChange={(e) => {
                const val = onlyDigits(e.target.value).slice(0, 12);
                setUserIdInput(val);
                setValidatedName("");
                setValidatedRegion("");
                setValidation(null);
                // cancel any in-flight request when editing
                abortRef.c?.abort();
                abortRef.c = null;
                setChecking(false);
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Server ID</label>
            <input
              type="text"
              name="serverId"
              placeholder="contoh: 1234"
              className="mt-1 w-full border border-slate-300 rounded px-3 py-2 bg-white text-slate-900 placeholder:text-slate-600"
              required
              inputMode="numeric"
              maxLength={5}
              value={serverIdInput}
              onChange={(e) => {
                const val = onlyDigits(e.target.value).slice(0, 5);
                setServerIdInput(val);
                setValidatedName("");
                setValidatedRegion("");
                setValidation(null);
                abortRef.c?.abort();
                abortRef.c = null;
                setChecking(false);
              }}
            />
          </div>
          <div className="col-span-2 -mt-1 flex items-center justify-between">
            <div className="text-xs text-slate-500">Format: UserID(ServerID), contoh: 12345678(1234).</div>
            {checking && <div className="text-[11px] text-slate-600">Memeriksa…</div>}
          </div>
          {validation && (
            <div className={`col-span-2 -mt-2 text-xs ${validation.ok ? 'text-green-700' : 'text-red-600'}`}>
              {validation.text}
            </div>
          )}
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-slate-700">User ID</label>
          <input type="text" name="userId" placeholder="Masukkan User ID" className="mt-1 w-full border border-slate-300 rounded px-3 py-2 bg-white text-slate-900 placeholder:text-slate-600" required />
        </div>
      )}

      {/* Variants selection */}
      {activeVariants.length > 0 ? (
        <div>
          <div className="mb-2 text-sm font-medium text-slate-700">Pilih Paket</div>
          {/* Condensed display: show selected (default cheapest). Tap to change. */}
          {(() => {
            const v = activeVariants[selectedIndex] || activeVariants[cheapestIndex];
            if (!v) return null;
            return (
              <button
                type="button"
                onClick={() => setShowVariantsModal(true)}
                className={`w-full rounded-lg border px-3 py-3 text-left transition shadow-sm bg-white border-slate-300 hover:border-slate-400`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {v.icon ? (
                      <img src={v.icon} alt="" className="w-9 h-9 object-contain" />
                    ) : null}
                    <div>
                      <div className="text-[15px] font-semibold text-slate-900 leading-tight mb-0">{v.label}</div>
                      <div className="text-xs text-slate-600 mt-0 flex flex-col items-start gap-0">
                        {/* Harga coret di atas harga regular */}
                        {v.compareAt != null && v.price != null && v.compareAt > v.price ? (
                          <span className="line-through text-red-500 text-[11px] italic">Rp {Number(v.compareAt).toLocaleString()}</span>
                        ) : null}
                        {v.compareAt == null && v.price != null && v.price > 0 ? (
                          <span className="line-through text-red-500 text-[11px] italic">Rp {(Number(v.price) * 1.15).toLocaleString()}</span>
                        ) : null}
                        {v.price != null && (
                          <span className="text-blue-600 font-bold text-[14px]">Rp {Number(v.price).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-blue-700">Ubah ▾</span>
                </div>
              </button>
            );
          })()}

          {/* Hidden field to submit selected index as nominal, matching previous backend expectation */}
          <input type="hidden" name="nominal" value={selectedIndex >= 0 ? String(selectedIndex) : ""} />

          {/* Modal with full variant list */}
          {showVariantsModal && (
            <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
              <div className="absolute inset-0 bg-black/40" onClick={() => setShowVariantsModal(false)} />
              <div className="relative z-10 w-full max-w-md sm:rounded-2xl bg-white border border-slate-200 shadow-lg p-4 sm:p-5 max-h-[85vh] overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-base font-semibold text-slate-900">Pilih Paket</div>
                  <button type="button" className="text-slate-500" onClick={() => setShowVariantsModal(false)}>✕</button>
                </div>
                <div className="overflow-y-auto -mx-1 px-1 pb-24 sm:pb-2 max-h-[70vh]">
                  <div className="grid grid-cols-2 gap-2">
                    {activeVariants.map((v, i) => {
                      const active = i === selectedIndex;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setSelectedIndex(i);
                            setSelectedPrice(v.price ?? price);
                            setShowVariantsModal(false);
                          }}
                          className={`h-full rounded-lg border px-3 py-2 text-left transition shadow-sm ${active ? 'border-blue-600 ring-2 ring-blue-200 bg-blue-50' : 'border-slate-300 hover:border-slate-400 bg-white'}`}
                        >
                          <div className="flex items-center gap-3">
                            {v.icon ? (
                              <img src={v.icon} alt="" className="w-9 h-9 object-contain" />
                            ) : null}
                            <div>
                              <div className="text-[15px] font-semibold text-slate-900 leading-tight mb-0">{v.label}</div>
                              <div className="text-xs text-slate-600 mt-0 flex flex-col items-start gap-0">
                                {/* Harga coret di atas harga regular */}
                                {v.compareAt != null && v.price != null && v.compareAt > v.price ? (
                                  <span className="line-through text-red-500 text-[12px] italic">Rp {Number(v.compareAt).toLocaleString()}</span>
                                ) : null}
                                {v.compareAt == null && v.price != null && v.price > 0 ? (
                                  <span className="line-through text-red-500 text-[12px] italic">Rp {(Number(v.price) * 1.15).toLocaleString()}</span>
                                ) : null}
                                {v.price != null && (
                                  <span className="text-blue-600 font-bold text-[14px]">Rp {Number(v.price).toLocaleString()}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-slate-700">Nominal</label>
          <select name="nominal" className="mt-1 w-full border rounded px-3 py-2" required>
            <option value="">Pilih Nominal</option>
            <option value="10">10 Diamonds</option>
            <option value="50">50 Diamonds</option>
            <option value="100">100 Diamonds</option>
          </select>
        </div>
      )}

  {/* Payment method selector (compact, like variant) */}
  {!hidePaymentMethods && (
        <div>
          <div className="mb-2 text-sm font-medium text-slate-700">Metode Pembayaran</div>
          {(() => {
            const apList = activePaymentsUI.filter((ap) => ap && ap.enabled !== false);
            const current = apList.find((ap) => ap.gateway === selectedGateway && ap.method === selectedMethod) || apList[0] || null;
            const kind = current ? methodToKind(current.method) : methodToKind(selectedMethod || '');
            const fallbackIcon = kind === 'transfer' ? '/images/iconpayment/bank.png' : kind === 'va' ? '/images/iconpayment/va.png' : '/images/iconpayment/qris.png';
            const base = selectedPrice ?? 0;
            const fee = current
              ? (current.feeType === 'percent' ? Math.round(base * (Number(current.feeValue || 0) / 100)) : Math.round(Number(current.feeValue || 0)))
              : Math.round(Number(methodFees[selectedMethod] || 0));
            const total = base + (isFinite(fee) ? fee : 0);
            const label = current ? (current.label || `${current.gateway}/${current.method}`) : (selectedMethod || 'Pilih metode');
            return (
              <button
                type="button"
                onClick={() => setShowMethodModal(true)}
                className={`w-full rounded-lg border px-3 py-3 text-left transition shadow-sm bg-white border-slate-300 hover:border-slate-400`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img src={current?.logoUrl || fallbackIcon} alt={label} className="w-9 h-9 object-contain" />
                    <div>
                      <div className="text-[15px] font-semibold text-slate-900 leading-tight mb-0 truncate">{label}</div>
                      <div className="text-xs text-slate-600 mt-0">
                        {selectedPrice != null ? (
                          <span>Total: <span className="text-blue-600 font-bold text-[13px]">Rp {Number(total).toLocaleString()}</span></span>
                        ) : (
                          <span>Pilih paket lebih dulu</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-blue-700">Ubah ▾</span>
                </div>
              </button>
            );
          })()}
        </div>
      )}

      {/* Summary & Submit */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">
          {selectedPrice != null ? (
            (() => { const fee = computeGatewayFee(selectedPrice || 0); const total = (selectedPrice || 0) + fee; return (<>
              Total: <span className="font-semibold text-slate-900">Rp {Number(total).toLocaleString()}</span>
            </>); })()
          ) : (
            <>Pilih paket untuk melihat total</>
          )}
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded px-4 py-2 font-semibold"
          disabled={showPageLoading || (activeVariants.length > 0 && selectedIndex < 0)}
          onClick={beginPayment}
        >
          Beli sekarang
        </button>
      </div>

  {message && <div className="mt-2 text-red-600 text-center">{message}</div>}
      {/* Payment Method Modal */}
      {showMethodModal && (
        <div className="fixed inset-0 z-[95]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowMethodModal(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <div className="text-base font-semibold text-slate-900">Pilih Metode Pembayaran</div>
                <button type="button" onClick={() => setShowMethodModal(false)} className="p-1 rounded text-slate-500 hover:bg-slate-100">✕</button>
              </div>
              <div className="p-3">
                {/* Header: Dompet */}
                <div className="text-[12px] font-medium text-slate-500 uppercase tracking-wide mb-2">Dompet</div>
                {/* GimCash row */}
                <div className="mb-3 flex items-center justify-between rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src="/images/logo/logo128.png" alt="GimCash" className="object-contain" style={{ width: 36, height: 36 }} />
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-slate-900">GimCash: {walletBalance == null ? '—' : <span className="text-blue-600">Rp {walletBalance.toLocaleString()}</span>}</div>
                      <div className="mt-1">
                        {!showTopupInput ? (
                          <button
                            type="button"
                            onClick={() => setShowTopupInput(true)}
                            className="text-[11px] px-2 py-0.5 rounded border border-blue-600 text-blue-700 hover:bg-blue-50"
                          >Topup</button>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-slate-600">Nominal</span>
                              <input
                                type="number"
                                inputMode="numeric"
                                min={1000}
                                step={1000}
                                placeholder="contoh: 20000"
                                className="h-7 w-28 border rounded px-2 text-[12px]"
                                value={topupAmount}
                                onChange={(e) => setTopupAmount(e.target.value ? Math.max(0, Number(e.target.value)) : '')}
                              />
                              <button
                                type="button"
                                onClick={() => setShowTopupInput(false)}
                                className="text-[11px] px-2 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
                              >Batal</button>
                              <button
                                type="button"
                                disabled={!topupAmount || Number(topupAmount) < 1000}
                                onClick={() => { if (topupAmount) window.location.href = `/account?topupAmount=${Number(topupAmount)}`; }}
                                className="text-[11px] px-2 py-1 rounded border border-blue-600 text-blue-700 disabled:opacity-50 hover:bg-blue-50"
                              >Lanjut</button>
                            </div>
                            <div className="flex items-center gap-2">
                              {[10000, 20000, 50000, 100000].map((amt) => (
                                <button
                                  key={amt}
                                  type="button"
                                  onClick={() => setTopupAmount(amt)}
                                  className="text-[11px] px-2 py-0.5 rounded border border-slate-200 hover:bg-slate-50"
                                >Rp {amt.toLocaleString()}</button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-slate-700 min-w-[120px] text-right">
                      {selectedPrice != null ? (() => { const fee = computeGatewayFee(selectedPrice || 0); const total = (selectedPrice || 0) + fee; return `Rp ${Number(total).toLocaleString()}`; })() : '—'}
                    </span>
                    {(() => {
                      const canUse = (walletBalance ?? -1) >= (selectedPrice ?? Number.POSITIVE_INFINITY);
                      if (canUse) {
                        return (
                          <label className="inline-flex items-center gap-2 text-[12px] text-slate-700">
                            <input type="checkbox" checked={useGimcash} onChange={(e) => setUseGimcash(e.target.checked)} />
                            <span>Gunakan</span>
                          </label>
                        );
                      }
                      return null; // Hide insufficient balance message as requested
                    })()}
                  </div>
                </div>

                {/* Header: Pembayaran Lain */}
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[12px] font-medium text-slate-500 uppercase tracking-wide">Pembayaran Lain</div>
                  <div className="text-[12px] text-slate-500">Bayar Total Belanja</div>
                </div>

                {(() => {
                  const canUse = (walletBalance ?? -1) >= (selectedPrice ?? Number.POSITIVE_INFINITY);
                  const allowed = activePaymentsUI.filter((ap) => {
                    if (!ap || !ap.method || !ap.gateway) return false;
                    const gw = gateways.find(g => g.name === ap.gateway);
                    return !!gw && gw.enabled && Array.isArray(gw.methods) && gw.methods.includes(ap.method);
                  });
                  const recommended = !canUse ? (allowed.find((ap) => methodToKind(ap.method) === 'qris')?.id || null) : null;
                  // expose in window for optional debugging (no side effects)
                  (typeof window !== 'undefined') && ((window as any).__apRecommended = recommended);
                  return null;
                })()}

                {/* Group: E-Wallet & QRIS */}
                {(() => {
                  const list = activePaymentsUI.filter((ap) => {
                    if (!ap || !ap.method || !ap.gateway) return false;
                    const gw = gateways.find(g => g.name === ap.gateway);
                    if (!gw || !gw.enabled || !Array.isArray(gw.methods) || !gw.methods.includes(ap.method)) return false;
                    const kind = methodToKind(ap.method);
                    return kind === 'qris' || kind === 'emoney';
                  });
                  if (!list.length) return null;
                  return (
                    <div className="mb-3">
                      <div className="text-[12px] text-slate-500 mb-1">E-Wallet & QRIS</div>
                      <div className="flex flex-col divide-y rounded-lg border border-slate-200 overflow-hidden">
                        {list.map((ap) => {
                          const kind = methodToKind(ap.method);
                          const fallbackIcon = kind === 'qris' ? '/images/iconpayment/qris.png'
                            : kind === 'emoney' ? '/images/iconpayment/emoney.png'
                            : '/images/iconpayment/va.png';
                          const base = selectedPrice ?? 0;
                          const fee = (ap.feeType === 'percent')
                            ? Math.round(base * (Number(ap.feeValue || 0) / 100))
                            : ((ap.feeValue ?? Number(methodFees[ap.method] || 0)) || 0);
                          const total = base + fee;
                          const rec = (typeof window !== 'undefined') ? ((window as any).__apRecommended === ap.id) : false;
                          return (
                            <button key={ap.id} type="button" onClick={() => chooseActivePayment(ap)} className="w-full bg-white hover:bg-slate-50">
                              <div className="flex items-center justify-between gap-2 px-3 py-2.5 text-[13px]">
                                <span className="flex items-center gap-2 min-w-0">
                                  <img src={ap.logoUrl || fallbackIcon} alt={ap.label} className="object-contain" style={{ width: 28, height: 28 }} />
                                  <span className="truncate text-left text-slate-900 font-medium">{ap.label || `${ap.gateway}/${ap.method}`}</span>
                                </span>
                                <span className="flex items-center gap-3">
                                  <span className="text-[12px] text-slate-700 min-w-[96px] text-right">{selectedPrice != null ? `Rp ${total.toLocaleString()}` : '—'}</span>
                                  <span className={`w-4 h-4 inline-block rounded-full border ${rec ? 'bg-blue-500 border-blue-600' : 'border-slate-300'}`} />
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Group: Lainnya (VA/Transfer) */}
                {(() => {
                  const list = activePaymentsUI.filter((ap) => {
                    if (!ap || !ap.method || !ap.gateway) return false;
                    const gw = gateways.find(g => g.name === ap.gateway);
                    if (!gw || !gw.enabled || !Array.isArray(gw.methods) || !gw.methods.includes(ap.method)) return false;
                    const kind = methodToKind(ap.method);
                    return kind === 'va' || kind === 'transfer';
                  });
                  if (!list.length) return null;
                  return (
                    <div className="mb-1">
                      <div className="text-[12px] text-slate-500 mb-1">Virtual Account & Transfer</div>
                      <div className="flex flex-col divide-y rounded-lg border border-slate-200 overflow-hidden">
                        {list.map((ap) => {
                          const kind = methodToKind(ap.method);
                          const fallbackIcon = kind === 'transfer' ? '/images/iconpayment/bank.png' : '/images/iconpayment/va.png';
                          const base = selectedPrice ?? 0;
                          const fee = (ap.feeType === 'percent')
                            ? Math.round(base * (Number(ap.feeValue || 0) / 100))
                            : ((ap.feeValue ?? Number(methodFees[ap.method] || 0)) || 0);
                          const total = base + fee;
                          const rec = (typeof window !== 'undefined') ? ((window as any).__apRecommended === ap.id) : false;
                          return (
                            <button key={ap.id} type="button" onClick={() => chooseActivePayment(ap)} className="w-full">
                              <div className="w-full rounded-lg border px-3 py-3 text-left transition shadow-sm bg-white border-slate-300 hover:border-slate-400 flex items-center justify-between gap-2 text-[13px]">
                                <span className="flex items-center gap-2 min-w-0">
                                  <img src={ap.logoUrl || fallbackIcon} alt={ap.label} className="object-contain" style={{ width: 28, height: 28 }} />
                                  <span className="truncate text-left text-slate-900 font-medium">{ap.label || `${ap.gateway}/${ap.method}`}</span>
                                </span>
                                <span className="flex items-center gap-3">
                                  <span className="text-[12px] text-slate-700 min-w-[96px] text-right">{selectedPrice != null ? `Rp ${total.toLocaleString()}` : '—'}</span>
                                  <span className={`w-4 h-4 inline-block rounded-full border ${rec ? 'bg-blue-500 border-blue-600' : 'border-slate-300'}`} />
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {activePaymentsUI.length === 0 && (
                  <div className="text-xs text-slate-500 border rounded p-3">Belum ada metode aktif. Atur di Dashboard &gt; Payment Gateway &gt; Active Payment.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowLogin(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white shadow-lg border border-slate-200 p-5">
            <div className="mb-3 text-base font-semibold text-slate-900">Masuk untuk melanjutkan</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex-1 inline-flex items-center justify-center gap-2 bg-[#0d6efd] hover:bg-[#0b5ed7] text-white rounded px-4 py-2 font-semibold"
                onClick={() => {
                  try {
                    if (typeof window !== 'undefined' && code === 'mlbb') {
                      const key = `topup:draft:${code}`;
                      sessionStorage.setItem(key, JSON.stringify({ userId: userIdInput, serverId: serverIdInput, ts: Date.now() }));
                  }
                  } catch {}
                  signIn('google', { callbackUrl: typeof window !== 'undefined' ? window.location.href : '/' });
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
                  <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12 s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C33.046,6.053,28.757,4,24,4C12.955,4,4,12.955,4,24 s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                  <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,16.108,18.961,13,24,13c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657 C33.046,6.053,28.757,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                  <path fill="#4CAF50" d="M24,44c4.691,0,8.964-1.802,12.207-4.744l-5.641-4.707C28.488,36.606,26.333,37,24,37 c-5.188,0-9.594-3.317-11.263-7.946l-6.5,5.017C9.553,39.556,16.227,44,24,44z"/>
                  <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.098,5.549 c0.001-0.001,0.002-0.001,0.003-0.002l5.641,4.707C35.564,38.377,44,33,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                </svg>
                Masuk dengan Google
              </button>
              <button type="button" className="px-4 py-2 rounded border border-slate-300 text-slate-700" onClick={() => setShowLogin(false)}>Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* Page overlay loading (preview: 5s) */}
      {showPageLoading && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="relative w-16 h-16">
              {/* static ring */}
              <div className="absolute inset-0 rounded-full border-4 border-white/30" />
              {/* animated ring */}
              <div className="absolute inset-0 rounded-full border-4 border-[#0d6efd] border-t-transparent animate-spin" />
              {/* center logo */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/logo/logo128.png"
                alt="Loading"
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
