import { NextRequest } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import sharp from "sharp";
import { ensureAdminRequest } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  try {
    if (!ensureAdminRequest(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const folder = String(form.get("folder") || "products");

    if (!file) return Response.json({ error: "No file" }, { status: 400 });
    const type = (file.type || "").toLowerCase();
    const isSvg = type.includes("svg");
    const isAllowedRaster = /(png|jpeg|jpg|webp|heic|heif)/i.test(type);
    if (!isSvg && !isAllowedRaster) {
      return Response.json({ error: "Invalid file type. Allowed: SVG, PNG, JPG, WEBP, HEIC/HEIF" }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return Response.json({ error: "Max 10MB" }, { status: 400 });
    }

    // Prepare paths
    const nameBase = (form.get("name") as string) || `img`;
    const safeBase = nameBase.toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$|\.$/g, "");
    const uniq = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const destDir = path.join(process.cwd(), "public", "images", "uploads", folder);
    await fs.mkdir(destDir, { recursive: true });

    if (isSvg) {
      // Sanitize SVG: remove scripts and on* event handlers to prevent XSS
      const raw = Buffer.from(await file.arrayBuffer()).toString("utf8");
      const sanitized = raw
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
        .replace(/on[a-zA-Z]+\s*=\s*"[^"]*"/g, "")
        .replace(/on[a-zA-Z]+\s*=\s*'[^']*'/g, "")
        .replace(/on[a-zA-Z]+\s*=\s*[^\s>]+/g, "");
      const fileName = `${(safeBase || "image")}-${uniq}.svg`;
      const destPath = path.join(destDir, fileName);
      await fs.writeFile(destPath, Buffer.from(sanitized, "utf8"));
      const url = `/images/uploads/${folder}/${fileName}`;
      return Response.json({ url });
    }

    // Raster image processing with sharp
    const buf = Buffer.from(await file.arrayBuffer());

    let meta;
    try {
      meta = await sharp(buf).metadata();
    } catch (e: any) {
      // Common when HEIC/HEIF isn't supported by libvips
      return Response.json({ error: "Gagal membaca gambar. Jika Anda mengunggah HEIC/HEIF, ubah ke JPG/PNG/WEBP lalu coba lagi." }, { status: 400 });
    }

    // Normalize by folder: banners keep large size, others compact to 512px box
    let pipeline = sharp(buf).rotate();
    if (folder === "banners") {
      // Keep large width for hero banners, limit to 1920x1080 max, preserve aspect ratio
      pipeline = pipeline.resize({ width: 1920, height: 1080, fit: "inside", withoutEnlargement: true });
    } else {
      // Products/Categories/Variants/Payments: compact
      pipeline = pipeline.resize(512, 512, { fit: "inside", withoutEnlargement: true });
    }

    // Preserve transparency for non-banners when source has alpha
    const usePng = folder !== "banners" && !!meta?.hasAlpha;
    const outBuffer = await (usePng ? pipeline.png({ compressionLevel: 9 }).toBuffer() : pipeline.jpeg({ quality: 85 }).toBuffer());

    const ext = usePng ? "png" : "jpg";
    const fileName = `${(safeBase || "image")}-${uniq}.${ext}`;
    const destPath = path.join(destDir, fileName);
    await fs.writeFile(destPath, outBuffer);

    const url = `/images/uploads/${folder}/${fileName}`;
    return Response.json({ url });
  } catch (err: any) {
    console.error("/api/admin/upload error:", err);
    return Response.json({ error: "Upload gagal. Coba lagi atau gunakan format PNG/JPG/SVG." }, { status: 500 });
  }
}
