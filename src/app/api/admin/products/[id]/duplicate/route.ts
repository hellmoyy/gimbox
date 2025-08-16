import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../../../lib/mongodb";

function ensureAdmin(req: NextRequest) {
  const cookie = req.cookies.get("admin_session")?.value;
  if (!cookie || cookie !== (process.env.AUTH_SECRET || "dev")) {
    return false;
  }
  return true;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!ensureAdmin(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = params;
  try {
    const db = await getDb();
    const existing = await db.collection("products").findOne({ _id: new ObjectId(id) });
    if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

    const { _id, ...rest } = existing as any;
    // Prepare duplicate fields
    const baseName: string = String(rest.name || "Produk");
    const baseCode: string = String(rest.code || "produk");

    // Generate unique code with -copy suffix (increment if needed)
    let attempt = 0;
    let newCode = `${baseCode}-copy`;
    while (await db.collection("products").findOne({ code: newCode })) {
      attempt += 1;
      newCode = `${baseCode}-copy-${attempt + 1}`; // copy-2, copy-3, ...
      if (attempt > 50) {
        newCode = `${baseCode}-copy-${Date.now().toString(36).slice(-4)}`;
        break;
      }
    }

    const newDoc: any = {
      ...rest,
      name: `${baseName} (Copy)`,
      code: newCode,
      isActive: (rest.isActive ?? true) !== false,
    };
    // Ensure variants are deep-copied and without accidental ids
    if (Array.isArray(rest.variants)) {
      newDoc.variants = rest.variants.map((v: any) => ({
        label: String(v.label || ""),
        sku: v.sku ? String(v.sku) : undefined,
        cost: v.cost === null || v.cost === undefined ? null : Number(v.cost),
        price: v.price === null || v.price === undefined ? null : Number(v.price),
        isActive: (v.isActive ?? true) !== false,
      }));
    }

    const result = await db.collection("products").insertOne(newDoc);
    const newId = result.insertedId.toString();
    return Response.redirect(new URL(`/admin/products/${newId}`, req.url));
  } catch (e: any) {
    const msg = e?.name === "MongoServerSelectionError" ? "Database unavailable" : "Invalid ID";
    return Response.json({ error: msg }, { status: 400 });
  }
}
