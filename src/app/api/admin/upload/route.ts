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

    // Raster image processing with sharp (convert/compress to modern format WebP by default)
    const buf = Buffer.from(await file.arrayBuffer());
    let meta;
    try {
      meta = await sharp(buf).metadata();
    } catch {
      return Response.json({ error: "Gagal membaca gambar. Jika HEIC/HEIF, ubah ke JPG/PNG/WEBP terlebih dahulu." }, { status: 400 });
    }

    const wantsOriginalFormat = String(form.get("keepFormat") || "").toLowerCase() === "true"; // optional override
    const targetFormat = wantsOriginalFormat ? (meta?.format || "jpeg") : "webp";

    // Base pipeline (auto rotate, strip metadata)
    const base = sharp(buf).rotate();

    // Sizing strategy:
    //  - banners: generate 2 responsive sizes (lg 1920w, md 960w)
    //  - others: single max 512px box
    const outputs: { name: string; buffer: Buffer }[] = [];
    const baseName = (safeBase || "image") + "-" + uniq;

    if (folder === "banners") {
      const lg = base.clone().resize({ width: 1920, height: 1080, fit: "inside", withoutEnlargement: true });
      const md = base.clone().resize({ width: 960, height: 540, fit: "inside", withoutEnlargement: true });
      const quality = targetFormat === "webp" ? 78 : 82;
      const toBuf = async (p: sharp.Sharp) => targetFormat === "webp"
        ? p.webp({ quality, effort: 5 }).toBuffer()
        : p.jpeg({ quality, mozjpeg: true }).toBuffer();
      const [lgBuf, mdBuf] = await Promise.all([toBuf(lg), toBuf(md)]);
      outputs.push({ name: `${baseName}-lg.${targetFormat === 'webp' ? 'webp' : 'jpg'}`, buffer: lgBuf });
      outputs.push({ name: `${baseName}-md.${targetFormat === 'webp' ? 'webp' : 'jpg'}`, buffer: mdBuf });
    } else {
      // Compact assets
      let sized = base.resize(512, 512, { fit: "inside", withoutEnlargement: true });
      // If keeping original & has alpha and original is png, prefer png; else webp handles alpha
      const quality = targetFormat === "webp" ? 82 : 85;
      if (targetFormat === "webp") {
        sized = sized.webp({ quality, effort: 5 });
      } else if ((meta?.hasAlpha && meta?.format === 'png')) {
        sized = sized.png({ compressionLevel: 9 });
      } else {
        sized = sized.jpeg({ quality, mozjpeg: true });
      }
      const assetBuf = await sized.toBuffer();
      outputs.push({ name: `${baseName}.${targetFormat === 'webp' ? 'webp' : (meta?.hasAlpha && meta?.format === 'png' ? 'png' : 'jpg')}`, buffer: assetBuf });
    }

    // Persist all generated variants
    for (const o of outputs) {
      await fs.writeFile(path.join(destDir, o.name), o.buffer);
    }

    // Primary URL = first variant
    const url = `/images/uploads/${folder}/${outputs[0].name}`;
    const variants = outputs.slice(1).map(o => `/images/uploads/${folder}/${o.name}`);
    return Response.json({ url, variants });
  } catch (err: any) {
    console.error("/api/admin/upload error:", err);
    return Response.json({ error: "Upload gagal. Coba lagi atau gunakan format PNG/JPG/SVG." }, { status: 500 });
  }
}
