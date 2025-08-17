import Link from "next/link";
import { getDb } from "@/lib/mongodb";
import { cookies } from "next/headers";
import { AUTH_SECRET as CFG_AUTH } from "@/lib/runtimeConfig";

export const dynamic = "force-dynamic";

export default async function AdminTicketsPage() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get("admin_session")?.value;
  const guard = (typeof CFG_AUTH === "string" && CFG_AUTH.length ? CFG_AUTH : undefined) || process.env.AUTH_SECRET || "dev";
  if (!cookie || cookie !== guard) {
    return <div>Unauthorized</div> as any;
  }
  const db = await getDb();
  const rows = await db
    .collection("tickets")
    .find({}, { projection: { _id: 0 } })
    .sort({ updatedAt: -1 })
    .limit(500)
    .toArray();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Tiket Bantuan</h1>
      </div>
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-2 pr-4">Tanggal</th>
              <th className="py-2 pr-4">Ticket</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Subjek</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Order</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="py-3 text-slate-500">Belum ada tiket.</td></tr>
            ) : (
        rows.map((r: any) => (
                <tr key={r.ticketId} className="border-t">
                  <td className="py-2 pr-4 whitespace-nowrap">{new Date(r.updatedAt).toLocaleString("id-ID")}</td>
          <td className="py-2 pr-4 font-mono text-xs"><Link href={`/admin/tickets/${r.ticketId}`} className="text-indigo-600">{r.ticketId}</Link></td>
                  <td className="py-2 pr-4">{r.email}</td>
                  <td className="py-2 pr-4">{r.subject}</td>
                  <td className="py-2 pr-4"><span className="px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs uppercase">{r.status}</span></td>
                  <td className="py-2 pr-4">{r.orderId || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
