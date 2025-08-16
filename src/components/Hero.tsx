export default function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-4 mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="rounded-xl overflow-hidden shadow bg-gradient-to-r from-indigo-500 to-blue-500 min-h-36 flex items-center">
        <div className="p-6 text-white">
          <div className="text-2xl font-bold">Top Up Diamond Mobile Legends</div>
          <div className="opacity-90">Murah dan Cepat</div>
        </div>
        <img src="https://picsum.photos/seed/ml/600/240" alt="ML Banner" className="hidden md:block ml-auto h-full object-cover" />
      </div>
      <div className="rounded-xl overflow-hidden shadow bg-gradient-to-r from-emerald-500 to-teal-500 min-h-36 flex items-center">
        <div className="p-6 text-white">
          <div className="text-2xl font-bold">Christmas Bonus top up 50%</div>
          <div className="opacity-90">Top up sekarang</div>
        </div>
        <img src="https://picsum.photos/seed/pubg/600/240" alt="PUBG Banner" className="hidden md:block ml-auto h-full object-cover" />
      </div>
    </section>
  );
}
