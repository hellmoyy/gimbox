"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
	const r = useRouter();
	const [error, setError] = useState("");

	async function onSubmit(e: any) {
		e.preventDefault();
		setError("");
		const email = e.target.email.value;
		const pass = e.target.password.value;
		const res = await fetch("/api/admin/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, pass }),
		});
		const j = await res.json();
		if (!j.success) return setError(j.message || "Login gagal");
		r.push("/admin");
	}

		return (
			<main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-[#f5f7fb] p-4">
				<div className="w-full max-w-sm">
					<div className="text-center mb-4">
						<div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 font-bold">TS</div>
						<div className="mt-2 text-lg font-semibold text-[#111827]">Admin Panel</div>
						<p className="text-xs text-gray-500">Masuk untuk mengelola produk dan pesanan</p>
					</div>
					<form onSubmit={onSubmit} className="bg-[#fefefe] rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
						<div>
							<label className="block text-xs font-medium text-slate-800">Email</label>
							<input name="email" type="email" placeholder="admin@example.com" className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 bg-[#fefefe] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" required />
						</div>
						<div>
							<label className="block text-xs font-medium text-slate-800">Password</label>
							<input name="password" type="password" placeholder="••••••••" className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 bg-[#fefefe] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" required />
						</div>
						{error && <div className="text-red-600 text-sm text-center">{error}</div>}
						<button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2.5 font-semibold transition-colors">Masuk</button>
					</form>
					<div className="mt-3 text-center text-xs text-gray-500">Butuh bantuan? Hubungi owner.</div>
				</div>
			</main>
		);
}
