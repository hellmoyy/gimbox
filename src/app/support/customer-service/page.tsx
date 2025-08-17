export default function CustomerServicePage() {
  return (
    <main className="min-h-screen pb-24">
      <div className="mx-auto max-w-md px-4 pt-6">
        <h1 className="text-xl font-semibold text-slate-900 mb-3">Customer Service</h1>
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="text-sm text-slate-700">Butuh bantuan? Hubungi kami melalui salah satu kanal berikut:</div>
          <ul className="text-sm text-slate-800 space-y-2">
            <li>
              <a href="mailto:support@gimbox.id" className="text-indigo-600">Email: support@gimbox.id</a>
            </li>
            <li>
              <a href="https://wa.me/6281234567890" target="_blank" rel="noopener" className="text-indigo-600">WhatsApp: +62 812-3456-7890</a>
            </li>
            <li>
              <a href="/tickets" className="text-indigo-600">Buka Tiket Bantuan</a>
            </li>
          </ul>
          <div className="text-[11px] text-slate-500">Untuk pelaporan transaksi, sertakan Order ID agar cepat ditangani.</div>
        </div>
      </div>
    </main>
  );
}
