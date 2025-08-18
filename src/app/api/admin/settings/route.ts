import { NextRequest } from "next/server";
import { getDb } from "../../../../lib/mongodb";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const data = Object.fromEntries(form.entries());
  // Coerce known boolean fields (checkboxes)
  const gamification_enabled =
    (data as any).gamification_enabled === "on" ||
    (data as any).gamification_enabled === "true" ||
    (data as any).gamification_enabled === "1" ||
    (data as any).gamification_enabled === true;
  const update: any = { ...data, gamification_enabled };
  try {
    const db = await getDb();
    await db.collection("settings").updateOne(
      { _id: "main" as any },
  { $set: update },
      { upsert: true }
    );
  } catch (e) {
    return Response.json({ error: "Database unavailable" }, { status: 503 });
  }
  return Response.redirect(new URL("/admin/settings", req.url));
}
