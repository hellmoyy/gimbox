export default function ImportNewProductsPage({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {
  const err = typeof searchParams?.error === "string" ? searchParams!.error : "";
  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto bg-[#fefefe] rounded-xl shadow border p-6">
        <h1 className="text-xl font-semibold mb-3">Import Produk Baru dari Provider</h1>
        <p className="text-sm text-slate-600 mb-4">Hanya menambahkan produk yang belum ada. Produk yang sudah ada tidak diubah.</p>
        {err ? (
          <div className="mb-3 rounded-lg border border-red-300 bg-red-50 text-red-800 px-4 py-2">
            {err}
          </div>
        ) : null}
        <form action="/api/admin/products/import" method="post" className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-900">Provider</label>
            <select name="provider" className="border border-slate-300 rounded px-3 py-2 bg-[#fefefe] text-slate-900">
              <option value="vcgamers">Vcgamers</option>
              <option value="digiflazz">Digiflazz</option>
              <option value="iak">IAK</option>
            </select>
          </div>
          <button className="bg-green-600 text-white px-4 py-2 rounded">Import Produk Baru</button>
        </form>
      </div>
    </main>
  );
}
