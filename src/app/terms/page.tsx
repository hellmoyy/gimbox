"use client";
import { useRouter } from "next/navigation";

export default function TermsPage() {
  const router = useRouter();
  const updated = new Date().toLocaleDateString("id-ID");
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 pb-24">
      <div className="rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm p-5 sm:p-6">
        <div className="mb-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md px-2 py-1"
            aria-label="Kembali"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-slate-600">
              <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Kembali</span>
          </button>
        </div>
        <h1 className="text-3xl font-semibold">Syarat & Ketentuan</h1>
        <p className="mt-2 text-slate-700 text-sm">Terakhir diperbarui: {updated}</p>

        <section className="mt-6 space-y-6 text-base leading-7">
          <div>
            <h2 className="text-lg font-semibold">Pengantar</h2>
            <p className="mt-2 text-slate-900">Dengan mengakses dan menggunakan layanan kami, Anda menyetujui Syarat & Ketentuan berikut.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Penggunaan Layanan</h2>
            <ul className="list-disc pl-5 mt-2 text-slate-900">
              <li>Anda setuju untuk menggunakan layanan sesuai hukum yang berlaku.</li>
              <li>Dilarang menyalahgunakan layanan untuk tindakan penipuan atau merugikan pihak lain.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Akun</h2>
            <ul className="list-disc pl-5 mt-2 text-slate-900">
              <li>Anda bertanggung jawab atas kerahasiaan kredensial akun.</li>
              <li>Aktivitas yang terjadi pada akun Anda menjadi tanggung jawab Anda.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Pembayaran & Transaksi</h2>
            <ul className="list-disc pl-5 mt-2 text-slate-900">
              <li>Harga dapat berubah sewaktu-waktu tanpa pemberitahuan.</li>
              <li>Pesanan diproses setelah pembayaran terverifikasi.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Produk Digital & Pengiriman</h2>
            <p className="mt-2 text-slate-900">Produk digital biasanya dikirim otomatis setelah pembayaran berhasil. Waktu proses dapat bervariasi bergantung penyedia.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Kebijakan Pengembalian</h2>
            <p className="mt-2 text-slate-900">Pengembalian dana mengikuti evaluasi kasus per kasus sesuai bukti transaksi dan kebijakan mitra penyedia.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Larangan</h2>
            <ul className="list-disc pl-5 mt-2 text-slate-900">
              <li>Pelanggaran hak kekayaan intelektual.</li>
              <li>Aktivitas ilegal atau merusak sistem.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Batasan Tanggung Jawab</h2>
            <p className="mt-2 text-slate-900">Kami tidak bertanggung jawab atas kerugian tidak langsung, insidental, atau konsekuensial akibat penggunaan layanan.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Perubahan</h2>
            <p className="mt-2 text-slate-900">Kami dapat memperbarui Syarat & Ketentuan ini. Perubahan akan diberlakukan setelah dipublikasikan.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Hukum yang Berlaku</h2>
            <p className="mt-2 text-slate-900">Syarat & Ketentuan ini diatur oleh hukum yang berlaku di wilayah operasional kami.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Kontak</h2>
            <p className="mt-2 text-slate-900">Untuk pertanyaan, silakan hubungi kami melalui email dukungan yang tercantum pada situs.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
