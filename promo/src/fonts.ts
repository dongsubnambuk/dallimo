import { continueRender, delayRender, staticFile } from 'remotion';

// 앱과 같은 Pretendard. 글꼴이 다 올라올 때까지 첫 프레임을 기다린다
const WEIGHTS: [string, number][] = [
  ['Medium', 500],
  ['Bold', 700],
  ['ExtraBold', 800],
  ['Black', 900],
];

let loaded = false;
export function loadFonts() {
  if (loaded || typeof document === 'undefined') return;
  loaded = true;
  const handle = delayRender('Pretendard');
  Promise.all(
    WEIGHTS.map(([name, weight]) => {
      const face = new FontFace('Pretendard', `url(${staticFile(`fonts/Pretendard-${name}.otf`)}) format('opentype')`, { weight: String(weight) });
      document.fonts.add(face);
      return face.load();
    }),
  ).then(() => continueRender(handle));
}
