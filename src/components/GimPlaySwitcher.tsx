"use client";
import { useState } from "react";
import GimPlayAim from "./GimPlayAim";
import GimPlayRunner from "./GimPlayRunner";

export default function GimPlaySwitcher() {
  const [tab, setTab] = useState<"aim" | "runner">("aim");
  return (
    <div>
      <div className="inline-flex bg-slate-100 rounded-lg p-1 text-sm font-semibold">
        <button
          className={`px-3 py-1.5 rounded-md ${tab === "aim" ? "bg-white shadow border border-slate-200" : "text-slate-600"}`}
          onClick={() => setTab("aim")}
        >
          Aim Trainer
        </button>
        <button
          className={`px-3 py-1.5 rounded-md ${tab === "runner" ? "bg-white shadow border border-slate-200" : "text-slate-600"}`}
          onClick={() => setTab("runner")}
        >
          Ninja Run
        </button>
      </div>

      <div className="mt-3">
        {tab === "aim" ? <GimPlayAim /> : <GimPlayRunner />}
      </div>
    </div>
  );
}
