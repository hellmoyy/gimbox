import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function getApiKey() {
  return process.env.RAPIDAPI_KEY || process.env.ID_GAME_CHECKER_API_KEY || "";
}

export async function POST(req: NextRequest) {
  try {
    const { userId, serverId } = await req.json();
    if (!userId || !serverId) {
      return Response.json({ ok: false, error: "Missing userId or serverId" }, { status: 400 });
    }
    const apiKey = getApiKey();
    if (!apiKey) {
      return Response.json({ ok: false, error: "Missing RAPIDAPI_KEY. Set it in .env.local" }, { status: 500 });
    }

    const url = `https://id-game-checker.p.rapidapi.com/mobile-legends/${encodeURIComponent(
      String(userId)
    )}/${encodeURIComponent(String(serverId))}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "x-rapidapi-key": apiKey,
        "x-rapidapi-host": "id-game-checker.p.rapidapi.com",
      },
      // 8s timeout via AbortController
      signal: (AbortSignal as any).timeout ? (AbortSignal as any).timeout(8000) : undefined,
    } as RequestInit);

    const text = await res.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      // keep raw text
    }
    const username = data?.username || data?.nickname || data?.name || data?.data?.username || data?.data?.nickname || null;
    const region =
      data?.region ||
      data?.server ||
      data?.area ||
      data?.zone ||
      data?.country ||
      data?.data?.region ||
      data?.data?.server ||
      data?.data?.zone ||
      null;
    if (!res.ok) {
      return Response.json(
        { ok: false, error: data?.message || "Lookup failed", raw: data || text },
        { status: res.status }
      );
    }
    return Response.json({ ok: true, username, region, raw: data || text });
  } catch (e: any) {
    const msg = e?.name === "TimeoutError" ? "Request timeout" : e?.message || "Unexpected error";
    return Response.json({ ok: false, error: msg }, { status: 500 });
  }
}
