import Client from "@/app/gamification/pet/petClient";

export default async function PetPage() {
  return (
    <main className="min-h-screen pb-28">
      <div className="mx-auto max-w-md px-4 pt-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-900">GimPet</h1>
          <a href="/gamification" className="text-sm text-blue-600 font-semibold">← Kembali</a>
        </div>
        <p className="text-slate-600 mt-1">Rawat peliharaanmu, tingkatkan level, dan kumpulkan koin.</p>

        <div className="mt-4">
          <Client />
        </div>
      </div>
    </main>
  );
}
