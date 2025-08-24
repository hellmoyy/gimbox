#!/usr/bin/env node
// Convert all .webp images in public/images to .jpg
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function convertDir(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const p = path.join(dir, f);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      await convertDir(p);
    } else if (p.endsWith('.webp')) {
      const out = p.replace(/\.webp$/, '.jpg');
      console.log(`Converting ${p} -> ${out}`);
      await sharp(p).jpeg({ quality: 90 }).toFile(out);
    }
  }
}

(async () => {
  const base = path.join(process.cwd(), 'public', 'images');
  if (!fs.existsSync(base)) {
    console.error('No public/images folder found');
    process.exit(1);
  }
  await convertDir(base);
})();
