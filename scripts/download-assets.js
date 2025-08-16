#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const ROOT = process.cwd();
const SRC_HOME_DATA = path.join(ROOT, 'src', 'lib', 'homeData.ts');
const OUT_TS = path.join(ROOT, 'src', 'lib', 'homeData.local.ts');
const IMG_DIR_G = path.join(ROOT, 'public', 'images', 'games');
const IMG_DIR_V = path.join(ROOT, 'public', 'images', 'vouchers');

fs.mkdirSync(IMG_DIR_G, { recursive: true });
fs.mkdirSync(IMG_DIR_V, { recursive: true });

function parseItems(sectionName) {
  const ts = fs.readFileSync(SRC_HOME_DATA, 'utf8');
  const sectionRegex = new RegExp(`export const ${sectionName} = \\[(.*?)\\];`, 's');
  const sectionMatch = ts.match(sectionRegex);
  if (!sectionMatch) return [];
  const arrText = sectionMatch[1];
  const itemRegex = /\{\s*code:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*icon:\s*"([^"]+)"\s*\}/g;
  const items = [];
  let m;
  while ((m = itemRegex.exec(arrText)) !== null) {
    items.push({ code: m[1], name: m[2], icon: m[3] });
  }
  return items;
}

async function probeAndDownload(urls, outPath) {
  for (const url of urls) {
    try {
      const head = await axios.get(url, { responseType: 'stream', validateStatus: () => true });
      if (head.status >= 200 && head.status < 300) {
        const ct = head.headers['content-type'] || '';
        let ext = 'jpg';
        if (ct.includes('png')) ext = 'png';
        else if (ct.includes('jpeg') || ct.includes('jpg')) ext = 'jpg';
        else if (ct.includes('webp')) ext = 'webp';
        const finalPath = outPath.replace(/\.ext$/i, '.' + ext);
        await new Promise((resolve, reject) => {
          const writer = fs.createWriteStream(finalPath);
          head.data.pipe(writer);
          writer.on('finish', resolve);
          writer.on('error', reject);
        });
        return { path: finalPath, ext };
      }
    } catch (e) {
      // try next
    }
  }
  throw new Error('All candidates failed for ' + urls[0]);
}

(async () => {
  const sections = ['featured', 'vouchers', 'allGames'];
  const results = {};
  for (const s of sections) {
    const items = parseItems(s);
    results[s] = [];
    for (const it of items) {
      const isVoucher = it.icon.includes('/voucher/');
      const outBase = path.join(isVoucher ? IMG_DIR_V : IMG_DIR_G, it.code + '.ext');
      const baseUrl = it.icon.replace(/\.(webp|png|jpg|jpeg)$/i, '');
      const candidates = [baseUrl + '.png', baseUrl + '.jpg', baseUrl + '.jpeg', baseUrl + '.webp'];
      try {
        const { path: savedPath, ext } = await probeAndDownload(candidates, outBase);
        const rel = '/images/' + (isVoucher ? 'vouchers' : 'games') + '/' + it.code + '.' + ext;
        results[s].push({ code: it.code, name: it.name, icon: rel });
        console.log('Saved', rel);
      } catch (err) {
        console.error('Failed for', it.code, err.message);
      }
    }
  }

  const toTs = (name, arr) => `export const ${name} = ${JSON.stringify(arr, null, 2)} as const;\n`;
  const tsOut = [toTs('featured', results.featured), toTs('vouchers', results.vouchers), toTs('allGames', results.allGames)].join('\n');
  fs.writeFileSync(OUT_TS, tsOut);
  console.log('Wrote', OUT_TS);
})();
