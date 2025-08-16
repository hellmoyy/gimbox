import { NextRequest } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import sharp from "sharp";

function ensureAdmin(req: NextRequest) {
  const cookie = req.cookies.get("admin_session")?.value;
  if (!cookie || cookie !== (process.env.AUTH_SECRET || "dev")) return false;
  return true;
}

export async function POST(req: NextRequest) {
  if (!ensureAdmin(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const folder = String(form.get("folder") || "products");

  if (!file) return Response.json({ error: "No file" }, { status: 400 });
  const type = file.type || "";
  // Accept common image types including HEIC/HEIF, convert to JPG later
  if (!/(png|jpeg|jpg|webp|heic|heif)/i.test(type)) {
    return Response.json({ error: "Invalid file type" }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return Response.json({ error: "Max 5MB" }, { status: 400 });
  }

  // Read file buffer
  const buf = Buffer.from(await file.arrayBuffer());
  const meta = await sharp(buf).metadata();

  // Normalize by folder: banners keep large size, others compact to 512px box
  let pipeline = sharp(buf).rotate();
  if (folder === "banners") {
    // Keep large width for hero banners, limit to 1920x1080 max, preserve aspect ratio
    pipeline = pipeline.resize({ width: 1920, height: 1080, fit: "inside", withoutEnlargement: true });
  } else {
    // Products/Categories/Variants: compact
    pipeline = pipeline.resize(512, 512, { fit: "inside", withoutEnlargement: true });
  }

  // Preserve transparency for non-banners when source has alpha
  const usePng = folder !== "banners" && !!meta?.hasAlpha;
  const outBuffer = await (usePng ? pipeline.png({ compressionLevel: 9 }).toBuffer() : pipeline.jpeg({ quality: 85 }).toBuffer());

  const nameBase = (form.get("name") as string) || `img`;
  const safeBase = nameBase.toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$|\.$/g, "");
  const uniq = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const ext = usePng ? "png" : "jpg";
  const fileName = `${(safeBase || "image")}-${uniq}.${ext}`;

  const destDir = path.join(process.cwd(), "public", "images", "uploads", folder);
  const destPath = path.join(destDir, fileName);
  await fs.mkdir(destDir, { recursive: true });
  await fs.writeFile(destPath, outBuffer);

  const url = `/images/uploads/${folder}/${fileName}`;
  return Response.json({ url });
}
