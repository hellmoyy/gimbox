import { NextRequest } from "next/server";
import { getDb } from "../../../../lib/mongodb";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const data = Object.fromEntries(form.entries());
  try {
    const db = await getDb();
    await db.collection("settings").updateOne(
      { _id: "main" as any },
      { $set: data },
      { upsert: true }
    );
  } catch (e) {
    return Response.json({ error: "Database unavailable" }, { status: 503 });
  }
  return Response.redirect(new URL("/admin/settings", req.url));
}
