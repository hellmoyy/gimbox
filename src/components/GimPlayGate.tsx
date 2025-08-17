"use client";
import { useEffect, useMemo, useState } from "react";
import { useSession, signIn } from "next-auth/react";

type Choice = "char01" | "char02" | "char03" | "char04" | "char05" | "char06";

export default function GimPlayGate({ onReady }: { onReady: (character: Choice, name: string) => void }) {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<{ selectedCharacter?: Choice; characterName?: string } | null>(null);
  const [choice, setChoice] = useState<Choice>("char01");
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const validName = useMemo(() => name.trim().length >= 6, [name]);
  const [taken, setTaken] = useState<Choice[]>([]);

  useEffect(() => {
    if (status === "authenticated") {
      (async () => {
        const res = await fetch("/api/profile", { cache: "no-store" });
        const j = await res.json();
        const p = j?.profile as any | null;
        setProfile(p);
        if (Array.isArray(j?.taken)) {
          setTaken(j.taken as Choice[]);
        }
        if (p && p.selectedCharacter && p.characterName && String(p.characterName).trim().length >= 6) {
          onReady(p.selectedCharacter as Choice, String(p.characterName));
        } else {
          if (p?.selectedCharacter) setChoice(p.selectedCharacter as Choice);
          if (p?.characterName) setName(String(p.characterName));
          setShowModal(true);
        }
      })();
    }
  }, [status]);

  async function save() {
    try {
      setLoading(true);
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedCharacter: choice, characterName: name.trim() }),
      });
      if (res.ok) {
        setShowModal(false);
        onReady(choice, name.trim());
      } else if (res.status === 409) {
        // Character taken; refresh taken list
        const r = await fetch("/api/profile", { cache: "no-store" });
        const j = await r.json();
        if (Array.isArray(j?.taken)) setTaken(j.taken as Choice[]);
      }
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading") {
    return <div className="rounded-xl border p-4 animate-pulse h-40" />;
  }

  if (status !== "authenticated") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
        <div className="text-slate-800 font-semibold">Masuk untuk bermain</div>
        <div className="text-sm text-slate-600 mt-1">Login dibutuhkan untuk menyimpan progres dan pilihan karakter.</div>
        <button onClick={() => signIn()} className="mt-3 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold">Login</button>
      </div>
    );
  }

  return (
    <>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 border border-slate-200">
            <div className="text-lg font-semibold text-slate-900">Pilih Karaktermu</div>
            <div className="text-sm text-slate-600">Karakter awal hanya bisa dipilih sekali. Karakter premium dapat dibeli di dalam game.</div>
            {!profile?.selectedCharacter && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              {([
                { id: "char01", label: "Character 01", thumb: "/images/games/character/Character 01/Png/Character Sprite/Idle/Character-Idle_00.png" },
                { id: "char02", label: "Character 02", thumb: "/images/games/character/Character 02/Png/Character Sprite/Idle/Character-Idle_00.png" },
                { id: "char03", label: "Character 03", thumb: "/images/games/character/Character 03/Png/Character Sprite/Idle/Character-Idle_00.png" },
                { id: "char04", label: "Character 04", thumb: "/images/games/character/Character 04/Png/Character Sprite/Idle/Character-Idle_00.png" },
                { id: "char05", label: "Character 05", thumb: "/images/games/character/Character 05/Png/Character Sprite/Idle/Character-Idle_00.png" },
                { id: "char06", label: "Character 06", thumb: "/images/games/character/Character 06/Png/Character Sprite/Idle/Character-Idle_00.png" },
              ] as const).map((c) => (
                <button
                  key={c.id}
                  onClick={() => setChoice(c.id as Choice)}
                  disabled={taken.includes(c.id as Choice)}
                  className={`rounded-xl border p-2 text-center hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed ${choice === c.id ? "ring-2 ring-blue-500 border-blue-300" : "border-slate-200"}`}
                >
                  <div className="h-24 overflow-hidden flex items-center justify-center">
                    <img src={c.thumb} alt={c.label} className="h-24 w-auto object-contain select-none pointer-events-none scale-150 origin-center" />
                  </div>
                  <div className="mt-0.5 text-xs font-medium text-slate-800">{c.label}</div>
                </button>
              ))}
            </div>
            )}
            {profile?.selectedCharacter && (
              <div className="mt-3 text-xs text-slate-600">
                Karakter awalmu: <span className="font-semibold">{profile.selectedCharacter}</span>. Tidak bisa diganti. Kamu bisa membeli karakter premium di dalam game.
              </div>
            )}
            {taken.includes(choice) && (
              <div className="mt-2 text-xs text-rose-600">Karakter ini sudah diambil. Silakan pilih yang lain.</div>
            )}
            <div className="mt-3">
              <label className="block text-sm font-medium text-slate-800">Nama Karakter</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="min. 6 huruf"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 text-slate-900 placeholder:text-slate-400"
              />
              {!validName && (
                <div className="mt-1 text-xs text-rose-600">Nama minimal 6 huruf.</div>
              )}
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={save} disabled={loading || !validName || taken.includes(choice)} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-60">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
