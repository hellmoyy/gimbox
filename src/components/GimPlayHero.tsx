export default function GimPlayHero() {
  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
      <img
        src="/images/games/bannergimpet.png"
        alt="GimPet Adventure"
        className="h-40 w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
        <div>
          {/* Title removed as requested */}
          <div className="text-white/80 text-xs">Rawat, mainkan, dan menangkan hadiah</div>
        </div>
        <a
          href="/gamification/pet"
          className="px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-semibold shadow"
        >
          Mainkan
        </a>
      </div>
    </div>
  );
}
