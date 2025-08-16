"use client";
export const dynamic = "force-dynamic";
import { useRouter } from "next/navigation";

export default function PrivacyPage() {
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
        <h1 className="text-3xl font-semibold">Kebijakan Privasi</h1>
        <p className="mt-2 text-slate-700 text-sm">Terakhir diperbarui: {updated}</p>

      <section className="mt-6 space-y-5 text-base leading-7">
        <p>
          Kami menghormati privasi Anda. Halaman ini menjelaskan bagaimana kami mengumpulkan, menggunakan,
          dan melindungi informasi pribadi ketika Anda menggunakan layanan kami.
        </p>

        <div>
          <h2 className="text-lg font-semibold">Informasi yang Kami Kumpulkan</h2>
          <ul className="list-disc pl-5 mt-2 text-slate-900">
            <li>Data akun seperti nama dan email.</li>
            <li>Data transaksi: produk, nominal, dan metode pembayaran.</li>
            <li>Data teknis (IP, perangkat) untuk keamanan dan pencegahan penyalahgunaan.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Cara Kami Menggunakan Informasi</h2>
          <ul className="list-disc pl-5 mt-2 text-slate-900">
            <li>Memproses pesanan dan pembayaran.</li>
            <li>Mengelola akun dan layanan pelanggan.</li>
            <li>Meningkatkan keamanan dan kualitas layanan.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Berbagi Informasi</h2>
          <p className="mt-2 text-slate-900">
            Kami dapat membagikan sebagian data yang diperlukan kepada penyedia pembayaran dan mitra operasional untuk
            menyelesaikan transaksi Anda. Kami tidak menjual data pribadi Anda.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Keamanan Data</h2>
          <p className="mt-2 text-slate-900">Kami menerapkan langkah-langkah teknis dan organisasi untuk melindungi data Anda dari akses tidak sah.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Hak Anda</h2>
          <ul className="list-disc pl-5 mt-2 text-slate-900">
            <li>Meminta akses, koreksi, atau penghapusan data.</li>
            <li>Menarik persetujuan dan mengajukan keberatan atas pemrosesan tertentu.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Kontak</h2>
          <p className="mt-2 text-slate-900">Untuk pertanyaan terkait privasi, hubungi kami melalui email dukungan yang tercantum di situs.</p>
        </div>
      </section>
      </div>
    </div>
  );
}
