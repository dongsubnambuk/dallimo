// 배경 음악을 받는다: "Shiny Tech" Kevin MacLeod (incompetech.com), Creative Commons BY 4.0 (결정 로그 69항)
// 저작권 표시(credit)를 꼭 함께 단다: 영상 끝 장면 아래 글자 + 인스타그램 설명 (promo/README.md)
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const URL = 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Shiny%20Tech.mp3';
const out = join(dirname(fileURLToPath(import.meta.url)), '../public/music/shiny-tech.mp3');

if (existsSync(out)) {
  console.log('music: already downloaded');
} else {
  mkdirSync(dirname(out), { recursive: true });
  const res = await fetch(URL, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`음악을 받지 못했어요 (${res.status})`);
  writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  console.log('music: downloaded Shiny Tech');
}
