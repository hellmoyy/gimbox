export default async function GamificationPage() {
  // Placeholder data; later wire to real loyalty backend
  const points = 0;
  const tier = "Bronze";
  const streak = 0;

  return (
    <main className="min-h-screen pb-28">
      <div className="mx-auto max-w-md px-4 pt-6">
        <h1 className="text-xl font-semibold text-slate-900">Gamification</h1>
        <p className="text-slate-600 mt-1">Kumpulkan point, naik level, dan dapatkan hadiah.</p>

        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className="rounded-xl border border-slate-200 bg-[#fefefe] p-4">
            <div className="text-sm text-slate-500">Point</div>
            <div className="text-2xl font-bold text-slate-900">{points.toLocaleString()}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-[#fefefe] p-4">
            <div className="text-sm text-slate-500">Tier</div>
            <div className="text-2xl font-bold text-slate-900">{tier}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-[#fefefe] p-4">
            <div className="text-sm text-slate-500">Streak</div>
            <div className="text-2xl font-bold text-slate-900">{streak} hari</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-[#fefefe] p-4">
            <div className="text-sm text-slate-500">Misi</div>
            <ul className="mt-1 text-sm text-slate-700 list-disc pl-4">
              <li>Belanja hari ini (5 point)</li>
              <li>Verifikasi email (10 point)</li>
              <li>Lengkapi profil (5 point)</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-[#fefefe] p-4">
          <div className="font-semibold text-slate-900">Cara kerja</div>
          <p className="text-sm text-slate-600 mt-1">Belanja untuk mendapatkan point. Point menentukan tier kamu. Semakin tinggi tier, semakin besar benefit yang didapat.</p>
        </div>
      </div>
    </main>
  );
}
