import crypto from 'crypto';
import path from 'path';
import { promises as fs } from 'fs';
import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getDb } from './mongodb';

// Copy a remote image into our CDN (R2 or local) under images/uploads/{folder}
// - Caches by sourceUrl (asset_cache collection) so repeated URLs don't duplicate storage
// - Normalizes to webp (except svg stays svg)
// - Returns stored public URL or null on failure
export async function copyImageToCDN(sourceUrl: string, opts: { folder?: string; slug?: string } = {}) : Promise<string | null> {
  try {
    if (!sourceUrl) return null;
    // skip data URLs or already local / already our CDN
    if (/^data:/i.test(sourceUrl)) return null;
    const cdnBase = process.env.NEXT_PUBLIC_CDN_BASE || process.env.R2_PUBLIC_BASE || '';
    if (cdnBase && sourceUrl.startsWith(cdnBase)) return sourceUrl; // already ours
    if (sourceUrl.startsWith('/')) return sourceUrl; // already local path
    if (!/^https?:\/\//i.test(sourceUrl)) return null;

    const db = await getDb();
    const cacheId = crypto.createHash('sha1').update(sourceUrl).digest('hex');
  const cached = await db.collection('asset_cache').findOne({ _id: cacheId as any });
    if (cached?.storedUrl) return cached.storedUrl as string;

    // Fetch remote (timeout 10s)
    const ctrl = new AbortController();
    const to = setTimeout(()=>ctrl.abort(), 10000);
    let res: Response;
    try {
      res = await fetch(sourceUrl, { signal: ctrl.signal });
    } finally { clearTimeout(to); }
    if (!res.ok) throw new Error('fetch_non_200_'+res.status);
    const ct = (res.headers.get('content-type')||'').toLowerCase();
    const buf = Buffer.from(await res.arrayBuffer());
    // Decide format
    const isSvg = ct.includes('svg') || /\.svg($|\?)/i.test(sourceUrl);
    let outBuf: Buffer; let ext: string; let contentType: string;
    if (isSvg) {
      // simple sanitize: remove scripts
      const raw = buf.toString('utf8');
      const sanitized = raw.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi,'')
                           .replace(/on[a-zA-Z]+\s*=\s*"[^"]*"/g,'')
                           .replace(/on[a-zA-Z]+\s*=\s*'[^']*'/g,'');
      outBuf = Buffer.from(sanitized,'utf8');
      ext='svg'; contentType='image/svg+xml';
    } else {
      // raster -> decode with sharp and convert to webp (max 512)
      try {
        const img = sharp(buf).rotate().resize(512,512,{fit:'inside', withoutEnlargement:true}).webp({quality:82, effort:5});
        outBuf = await img.toBuffer();
        ext='webp'; contentType='image/webp';
      } catch {
        // fallback raw
        outBuf = buf; ext='bin'; contentType=ct || 'application/octet-stream';
      }
    }
    const folder = (opts.folder || 'remote');
    const baseName = (opts.slug || 'asset')
      .toLowerCase().replace(/[^a-z0-9-_]+/g,'-').replace(/-+/g,'-').replace(/(^-|-$)/g,'') || 'asset';
    const hashPart = crypto.createHash('sha1').update(outBuf).digest('hex').slice(0,12);
    const fileName = `${baseName}-${hashPart}.${ext}`;

    const useR2 = !!process.env.R2_BUCKET && !!process.env.R2_ACCESS_KEY_ID && !!process.env.R2_SECRET_ACCESS_KEY;
    let storedUrl: string | null = null;
    if (useR2) {
      const endpoint = process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
      const client = new S3Client({ region:'auto', endpoint, credentials:{ accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! } });
      const bucket = process.env.R2_BUCKET!;
      const key = `${folder}/${fileName}`;
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: outBuf, ContentType: contentType }));
      const basePublic = (process.env.R2_PUBLIC_BASE || `${endpoint}/${bucket}`).replace(/\/$/,'');
      storedUrl = `${basePublic}/${key}`;
    } else {
      const localDir = path.join(process.cwd(),'public','images','uploads', folder);
      await fs.mkdir(localDir,{recursive:true});
      await fs.writeFile(path.join(localDir,fileName), outBuf);
      storedUrl = `/images/uploads/${folder}/${fileName}`;
    }
    await db.collection('asset_cache').updateOne(
      { _id: cacheId as any },
      { $set: { _id: cacheId, sourceUrl, storedUrl, createdAt: new Date() } },
      { upsert: true }
    );
    return storedUrl;
  } catch (e) {
    return null;
  }
}

export function shouldCopyRemote(url?: string | null) {
  if (!url) return false;
  if (!process.env.COPY_REMOTE_IMAGES) return false;
  if (url.startsWith('/') || /^data:/i.test(url)) return false;
  const cdnBase = process.env.NEXT_PUBLIC_CDN_BASE || process.env.R2_PUBLIC_BASE || '';
  if (cdnBase && url.startsWith(cdnBase)) return false;
  return /^https?:\/\//i.test(url);
}
