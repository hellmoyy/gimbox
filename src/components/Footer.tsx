export default function Footer() {
  return (
  <footer className="mt-8 border-t border-slate-200 bg-[#fefefe] text-slate-600">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="text-center text-xs text-slate-500">METODE PEMBAYARAN</div>
        <div className="mt-2 flex items-center justify-center">
          <img
            src="/images/payment-methods.png"
            alt="Metode Pembayaran"
            className="max-h-14 sm:max-h-16 w-auto object-contain"
            loading="lazy"
          />
        </div>
        <div className="mt-4 text-center text-xs text-slate-400">© {new Date().getFullYear()} TokoSaya</div>
      </div>
    </footer>
  );
}
