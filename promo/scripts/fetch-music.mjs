// 배경 음악을 받는다 (결정 로그 69항). 곡 파일은 커밋하지 않는다
// - Promo: "Rising Forest" Diego Nava, Mixkit Stock Music Free License (소셜 영상 · 온라인 광고에 무료, 저작권 표시 필요 없음)
// - PromoShinyTech: "Shiny Tech" Kevin MacLeod (incompetech.com), CC BY 4.0. 저작권 표시를 꼭 단다 (promo/README.md)
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TRACKS = [
  { title: 'Rising Forest', file: 'rising-forest.mp3', url: 'https://assets.mixkit.co/music/471/471.mp3' },
  { title: 'Shiny Tech', file: 'shiny-tech.mp3', url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Shiny%20Tech.mp3' },
];
const dir = join(dirname(fileURLToPath(import.meta.url)), '../public/music');
mkdirSync(dir, { recursive: true });

for (const { title, file, url } of TRACKS) {
  const out = join(dir, file);
  if (existsSync(out)) {
    console.log(`music: ${title} already downloaded`);
    continue;
  }
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`음악 "${title}"을 받지 못했어요 (${res.status})`);
  writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  console.log(`music: downloaded ${title}`);
}
