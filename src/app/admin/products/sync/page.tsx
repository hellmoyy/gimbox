export default function SyncPage() {
  return (
    <main className="min-h-screen bg-gray-50 p-6">
  <div className="max-w-3xl mx-auto bg-[#fefefe] rounded-xl shadow border p-6">
        <h1 className="text-xl font-semibold mb-3">Sync Harga Produk</h1>
        <form action="/api/admin/products/sync" method="post" className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-900">Provider</label>
            <select name="provider" className="border border-slate-300 rounded px-3 py-2 bg-[#fefefe] text-slate-900">
              <option value="digiflazz">Digiflazz</option>
              <option value="iak">IAK</option>
            </select>
          </div>
          <button className="bg-indigo-600 text-white px-4 py-2 rounded">Jalankan</button>
        </form>
      </div>
    </main>
  );
}
