export default function CartPage() {
  return (
    <main className="min-h-screen pb-24">
      <div className="mx-auto max-w-6xl px-4 mt-6">
        <h1 className="text-xl font-semibold text-slate-900 mb-3">Keranjang</h1>
  <div className="rounded-xl border border-slate-200 bg-[#fefefe] p-6 text-center text-slate-600">
          Keranjang anda masih kosong.
          <div className="mt-3">
            <a href="/" className="inline-block bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg">Belanja Sekarang</a>
          </div>
        </div>
      </div>
    </main>
  );
}
