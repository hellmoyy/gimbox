"use client";
import { useEffect, useMemo, useState } from "react";
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

export default function TopupForm({ code, price, variants }: { code: string; price: number; variants?: Variant[] }) {
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
  const [gateways, setGateways] = useState<Array<{ name: string; enabled: boolean; methods: string[] }>>([]);
  const [selectedGateway, setSelectedGateway] = useState<string>("midtrans");
  const [selectedMethod, setSelectedMethod] = useState<string>("");

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
  // Load available gateways for user selection
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/gateways/available', { cache: 'no-store' });
        const j = await res.json();
        const list: Array<{ name: string; enabled: boolean; methods: string[] }> = Array.isArray(j?.data) ? j.data : [];
        const enabledList = list.filter((g) => g.enabled);
        setGateways(enabledList);
        if (enabledList.length) {
          setSelectedGateway(enabledList[0].name);
          setSelectedMethod(enabledList[0].methods?.[0] || "");
        }
      } catch {}
    })();
  }, []);

  // Auto-check helpers: debounce, abort, cache, throttle (2s between successes)
  const debounceRef = useMemo(() => ({ t: 0 as any }), []);
  const abortRef = useMemo(() => ({ c: null as AbortController | null }), []);
  const cacheRef = useMemo(() => new Map<string, { ok: boolean; username?: string; region?: string; ts: number }>(), []);
  const lastSuccessAtRef = useMemo(() => ({ ts: 0 }), []);
  const onlyDigits = (v: string) => v.replace(/\D+/g, "");

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
        return;
      }
    }

    // If not logged in, ask to login with Google first
    if (!sessionEmail) {
      setLoading(false);
      setShowLogin(true);
      return;
    }

    // Combine MLBB userId + serverId for backend single field, if provided
  const inputUserId = userIdInput || "";
  const serverId = serverIdInput || "";
    const combinedUserId = serverId && code === "mlbb" ? `${inputUserId}(${serverId})` : inputUserId;

  const data: any = {
      code,
      userId: combinedUserId,
      email: sessionEmail,
      nominal: form.nominal.value,
      price: selectedPrice ?? 0,
    };
  if (selectedGateway) data.gateway = selectedGateway;
  if (selectedMethod) data.method = selectedMethod;

    const res = await fetch("/api/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    setLoading(false);
    setMessage(result.message || "");
    if (result.snapToken) setSnapToken(result.snapToken);
    if (result.snapRedirectUrl) setSnapUrl(result.snapRedirectUrl);
    if (result.snapRedirectUrl) {
      // Prefer full-page redirect for better compatibility
      window.location.href = result.snapRedirectUrl;
    }
  }

  return (
    <form className="bg-[#fefefe] rounded-xl border border-slate-200 shadow p-5 flex flex-col gap-4" onSubmit={handleSubmit}>
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
                      <img src={v.icon} alt="" className="w-7 h-7 object-contain" />
                    ) : null}
                    <div>
                      <div className="text-[15px] font-semibold text-slate-900">{v.label}</div>
                      {(v.price != null || v.compareAt != null) && (
                        <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-2">
                          {v.compareAt != null && (
                            <span className="line-through text-red-500 text-[12px] italic">Rp {Number(v.compareAt).toLocaleString()}</span>
                          )}
                          {v.price != null && (
                            <span className="text-blue-600 font-bold text-[14px]">Rp {Number(v.price).toLocaleString()}</span>
                          )}
                        </div>
                      )}
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
                              <img src={v.icon} alt="" className="w-7 h-7 object-contain" />
                            ) : null}
                            <div>
                              <div className="text-[15px] font-semibold text-slate-900">{v.label}</div>
                              {(v.price != null || v.compareAt != null) && (
                                <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-2">
                                  {v.compareAt != null && (
                                    <span className="line-through text-red-500 text-[12px] italic">Rp {Number(v.compareAt).toLocaleString()}</span>
                                  )}
                                  {v.price != null && (
                                    <span className="text-blue-600 font-bold text-[14px]">Rp {Number(v.price).toLocaleString()}</span>
                                  )}
                                </div>
                              )}
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

      {/* Payment method selection */}
      {gateways.length > 0 && (
        <div className="rounded-lg border p-3">
          <div className="text-sm font-medium text-slate-700 mb-1">Metode Pembayaran</div>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-3 text-sm">
              {gateways.map((g) => (
                <label key={g.name} className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="gateway"
                    checked={selectedGateway === g.name}
                    onChange={() => {
                      setSelectedGateway(g.name);
                      setSelectedMethod(g.methods?.[0] || "");
                    }}
                  />
                  <span className="capitalize">{g.name}</span>
                </label>
              ))}
            </div>
            {gateways.find((g) => g.name === selectedGateway)?.methods?.length ? (
              <div className="text-xs text-slate-600">
                <div className="mb-1">Opsi:</div>
                <div className="flex flex-wrap gap-3">
                  {gateways
                    .find((g) => g.name === selectedGateway)!
                    .methods.map((m) => (
                      <label key={m} className="inline-flex items-center gap-2">
                        <input type="radio" name="method" checked={selectedMethod === m} onChange={() => setSelectedMethod(m)} />
                        <span>{m}</span>
                      </label>
                    ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Summary & Submit */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">
          {selectedPrice ? (
            <>Total: <span className="font-semibold text-slate-900">Rp {selectedPrice.toLocaleString()}</span></>
          ) : (
            <>Pilih paket untuk melihat total</>
          )}
        </div>
        <button
          type="submit"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded px-4 py-2 font-semibold"
          disabled={loading || (activeVariants.length > 0 && selectedIndex < 0)}
        >
          {loading && (
            <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
          )}
          {loading ? "Memproses…" : (selectedPrice ? `Checkout (Rp ${selectedPrice.toLocaleString()})` : "Checkout")}
        </button>
      </div>

      {message && <div className="mt-2 text-green-600 text-center">{message}</div>}
      {snapToken && (
        <div className="mt-4">
          <iframe
            src={`https://app.sandbox.midtrans.com/snap/v2/vtweb/${snapToken}`}
            title="Midtrans Payment"
            className="w-full h-[600px] border rounded"
          />
        </div>
      )}
      {/* Login popup */}
      {showLogin && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowLogin(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white shadow-lg border border-slate-200 p-5">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Masuk untuk Checkout</h3>
            <p className="text-sm text-slate-600 mb-4">Silakan masuk dengan Google untuk melanjutkan pembayaran.</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="flex-1 inline-flex items-center justify-center gap-2 bg-[#0d6efd] hover:bg-[#0b5ed7] text-white rounded px-4 py-2 font-semibold"
                onClick={() => signIn("google", { callbackUrl: typeof window !== 'undefined' ? window.location.href : '/' })}
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
    </form>
  );
}
