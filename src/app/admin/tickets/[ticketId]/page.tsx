import { cookies } from "next/headers";
import { AUTH_SECRET as CFG_AUTH } from "@/lib/runtimeConfig";
import ClientBox from "./ReplyClient";

async function getTicket(ticketId: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/admin/tickets/${ticketId}`, { cache: 'no-store' });
  return res.json();
}

export default async function AdminTicketDetailPage({ params }: { params: { ticketId: string } }) {
  const cookieStore = await cookies();
  const cookie = cookieStore.get("admin_session")?.value;
  const guard = (typeof CFG_AUTH === "string" && CFG_AUTH.length ? CFG_AUTH : undefined) || process.env.AUTH_SECRET || "dev";
  if (!cookie || cookie !== guard) {
    return <div>Unauthorized</div> as any;
  }

  const j = await getTicket(params.ticketId);
  const ticket = j?.ticket;
  if (!ticket) return <div className="p-4">Not found</div> as any;

  return (
    <main className="min-h-screen pb-24">
      <div className="mx-auto max-w-3xl px-4 mt-6">
        <h1 className="text-lg font-semibold">Ticket {ticket.ticketId}</h1>
        <div className="text-sm text-slate-600">{ticket.subject} • {ticket.email}</div>
        <div className="mt-4 bg-white border border-slate-200 rounded-xl divide-y">
          {ticket.messages?.map((m: any, idx: number) => (
            <div key={idx} className="p-3">
              <div className="text-xs text-slate-500">{m.author} • {new Date(m.createdAt).toLocaleString('id-ID')}</div>
              <div className="mt-1 whitespace-pre-wrap">{m.text}</div>
            </div>
          ))}
        </div>
  <ClientBox ticketId={ticket.ticketId} currentStatus={ticket.status} />
      </div>
    </main>
  );
}
