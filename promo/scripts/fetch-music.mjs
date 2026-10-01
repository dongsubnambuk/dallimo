// 배경 음악을 받는다: Kevin MacLeod (incompetech.com), Creative Commons BY 4.0 (결정 로그 69항)
// 저작권 표시(credit)를 꼭 함께 단다: 영상 끝 장면 아래 글자 + 인스타그램 설명 (promo/README.md)
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/';
const TRACKS = [
  { title: 'Laserpack', file: 'laserpack.mp3' }, // Promo
  { title: 'Shiny Tech', file: 'shiny-tech.mp3' }, // PromoShinyTech
];
const dir = join(dirname(fileURLToPath(import.meta.url)), '../public/music');
mkdirSync(dir, { recursive: true });

for (const { title, file } of TRACKS) {
  const out = join(dir, file);
  if (existsSync(out)) {
    console.log(`music: ${title} already downloaded`);
    continue;
  }
  const res = await fetch(BASE + encodeURIComponent(title) + '.mp3', { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`음악 "${title}"을 받지 못했어요 (${res.status})`);
  writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  console.log(`music: downloaded ${title}`);
}
