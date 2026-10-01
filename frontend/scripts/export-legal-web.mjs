// 앱 안 약관 본문(src/features/settings/legal)을 소개 사이트(../landing) 페이지로 만든다 (결정 로그 68항).
// 본문은 앱 코드 한 곳에서만 고치고, 고친 뒤 `npm run legal:web`으로 웹 페이지를 다시 만든다.
// 만드는 것: landing/terms · location-terms · privacy · support 의 index.html
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const here = dirname(fileURLToPath(import.meta.url));
const legalDir = join(here, '../src/features/settings/legal');
const outDir = join(here, '../../landing');

// legal/*.ts를 CommonJS로 바꿔 읽는다. 서로 부르는 것은 './types'뿐이다
const cache = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name);
  const source = readFileSync(join(legalDir, `${name}.ts`), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
  const module = { exports: {} };
  new Function('exports', 'require', 'module', outputText)(module.exports, (p) => load(p.replace('./', '')), module);
  cache.set(name, module.exports);
  return module.exports;
}

const { LEGAL_CONTACT } = load('types');
const DOCS = [
  { path: 'terms', doc: load('terms').TERMS_OF_SERVICE },
  { path: 'location-terms', doc: load('location').LOCATION_TERMS },
  { path: 'privacy', doc: load('privacy').PRIVACY_POLICY },
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// 앱 LegalScreen과 같은 규칙: ①항 · 1.호 · ·목록은 머리를 내어 쓰고, 가.는 소제목
const CLAUSE = /^([①-⑳])\s*/;
const ITEM = /^(\d+\.)\s+/;
const BULLET = /^(·)\s+/;
const SUBHEAD = /^[가-힣]\.\s+/;

function paragraph(text) {
  if (SUBHEAD.test(text)) return `<p class="sub">${esc(text)}</p>`;
  const clause = CLAUSE.exec(text);
  const item = clause ? null : (ITEM.exec(text) ?? BULLET.exec(text));
  const m = clause ?? item;
  if (!m) return `<p>${esc(text)}</p>`;
  return `<p class="hang${item ? ' lv1' : ''}"><span>${esc(m[1])}</span><span>${esc(text.slice(m[0].length))}</span></p>`;
}

function table({ head, rows }) {
  const th = head.map((h) => `<th scope="col">${esc(h)}</th>`).join('');
  const tr = rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('\n');
  return `<table><thead><tr>${th}</tr></thead><tbody>\n${tr}\n</tbody></table>`;
}

function page({ title, description, body }) {
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)} · 달리모</title>
  <meta name="description" content="${esc(description)}">
  <meta name="theme-color" content="#0b0b0c">
  <link rel="icon" type="image/png" sizes="32x32" href="../assets/favicon-32.png">
  <link rel="apple-touch-icon" href="../assets/apple-touch-icon.png">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
  <link rel="stylesheet" href="../assets/site.css">
</head>
<body>
  <!-- 이 파일은 frontend/scripts/export-legal-web.mjs가 만든다. 직접 고치지 않는다 -->
  <a class="skip" href="#main">본문으로 건너뛰기</a>
  <header class="wrap top">
    <a class="brand" href="../"><img src="../assets/icon-192.png" alt="" width="32" height="32">달리모</a>
    <nav aria-label="바로가기"><a href="../support/">문의</a></nav>
  </header>
  <main id="main" class="wrap doc">
${body}
  </main>
  <footer class="foot">
    <div class="wrap">
      <ul>
        <li><a href="../terms/">서비스 이용약관</a></li>
        <li><a href="../location-terms/">위치기반서비스 이용약관</a></li>
        <li><a href="../privacy/"><b>개인정보 처리방침</b></a></li>
        <li><a href="../support/">문의</a></li>
      </ul>
      <p>© 2026 달리모</p>
    </div>
  </footer>
</body>
</html>
`;
}

function legalPage(doc) {
  const sections = doc.sections
    .map((s) => `    <section>\n      <h2>${esc(s.heading)}</h2>\n${s.blocks.map((b) => '      ' + (typeof b === 'string' ? paragraph(b) : table(b))).join('\n')}\n    </section>`)
    .join('\n');
  const body = `    <h1>${esc(doc.title)}</h1>
    <p class="date">${esc(doc.effectiveDate)}부터 적용</p>
    <p class="intro">${esc(doc.intro)}</p>
${sections}`;
  return page({ title: doc.title, description: `달리모 ${doc.title}`, body });
}

// 문의 페이지 (App Store 지원 URL). 앱 안 경로와 같은 이름을 쓴다
function supportPage() {
  const email = LEGAL_CONTACT.email;
  const body = `    <h1>문의</h1>
    <p class="intro">달리모를 쓰다가 궁금한 점이나 불편한 점이 있으면 메일로 알려 주세요.</p>
    <section>
      <h2>메일 문의</h2>
      <p>${esc(LEGAL_CONTACT.operator)} · ${esc(email)}</p>
      <a class="mail" href="mailto:${esc(email)}">메일 보내기</a>
    </section>
    <section>
      <h2>자주 묻는 질문</h2>
      <dl class="faq">
        <dt>탈퇴는 어떻게 하나요?</dt>
        <dd>앱의 설정 &gt; 계정 &gt; 탈퇴하기에서 할 수 있어요. 탈퇴하면 계정 정보는 바로 지워져요.</dd>
        <dt>위치 권한을 다시 켜고 싶어요.</dt>
        <dd>휴대폰 설정에서 달리모를 찾아 위치를 허용해 주세요. 위치를 켜야 달리기를 기록할 수 있어요.</dd>
        <dt>기록이 코스 순위에 올라가지 않아요.</dt>
        <dd>코스 경로를 따라 끝까지 달린 기록만 순위에 올라가요. GPS가 약하거나 경로를 벗어나면 기록만 남고 순위에는 들어가지 않아요.</dd>
        <dt>저장된 심박을 지우고 싶어요.</dt>
        <dd>설정 &gt; Apple Watch에서 "심박을 기록에 저장"을 끄면 저장된 심박이 모두 지워져요.</dd>
      </dl>
    </section>`;
  return page({ title: '문의', description: '달리모 문의와 자주 묻는 질문', body });
}

function write(path, html) {
  mkdirSync(join(outDir, path), { recursive: true });
  writeFileSync(join(outDir, path, 'index.html'), html);
  console.log(`landing/${path}/index.html`);
}

for (const { path, doc } of DOCS) write(path, legalPage(doc));
write('support', supportPage());
