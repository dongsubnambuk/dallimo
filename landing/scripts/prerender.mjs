// 빌드 뒤처리 (결정 로그 68항)
// 1. 페이지 HTML의 <div id="root"></div>에 미리 그린 화면을 넣는다. 자바스크립트가 늦게 와도 글과 화면이 먼저 보이고, 검색 엔진도 내용을 읽는다.
// 2. Pretendard Variable에서 이 사이트 글자만 남긴 글꼴 하나를 만든다. 나눠진 글꼴 파일이 하나씩 올 때마다 화면을 다시 그리지 않게 한다.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import subsetFont from 'subset-font';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { render } = await import(pathToFileURL(join(root, 'dist-ssr/ssr.js')).href);

const FILES = {
  home: 'index.html',
  privacy: 'privacy/index.html',
  terms: 'terms/index.html',
  location: 'location-terms/index.html',
  support: 'support/index.html',
  notFound: '404.html',
};

let text = '';
for (const [page, file] of Object.entries(FILES)) {
  const path = join(root, 'dist', file);
  const html = readFileSync(path, 'utf8');
  if (!html.includes('<div id="root"></div>')) throw new Error(`${file}: root가 없어요`);
  const body = render(page);
  writeFileSync(path, html.replace('<div id="root"></div>', `<div id="root">${body}</div>`));
  text += html.replace(/<[^>]+>/g, ' ') + body.replace(/<[^>]+>/g, ' ');
  console.log(`prerendered ${file}`);
}

// 화면에서 바뀌는 글자(숫자 세기, 메뉴 열기)와 기본 문장 부호도 넣는다
const ascii = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('');
const chars = [...new Set(text + ascii + '·→←↑↓…“”‘’「」①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳©')].join('');
const source = readFileSync(join(root, 'node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2'));
const font = await subsetFont(source, chars, { targetFormat: 'woff2' });
mkdirSync(join(root, 'dist/fonts'), { recursive: true });
writeFileSync(join(root, 'dist/fonts/pretendard-site.woff2'), font);
console.log(`font: ${[...chars].length}자, ${Math.round(font.length / 1024)}KB`);

rmSync(join(root, 'dist-ssr'), { recursive: true, force: true });
