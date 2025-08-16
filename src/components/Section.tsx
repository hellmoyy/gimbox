import { ReactNode } from "react";

export default function Section({ id, title, icon, children }: { id?: string; title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="mx-auto max-w-6xl px-4 mt-6">
      <div className="flex items-center gap-2 mb-3 text-slate-800">
        <span className="text-base">{icon ?? "🔥"}</span>
        <h2 className="text-[15px] font-medium tracking-wide">{title}</h2>
        <div className="ml-auto h-px bg-slate-200 w-24" />
      </div>
      {children}
    </section>
  );
}
