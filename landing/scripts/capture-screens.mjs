// 앱 화면 캡처 (landing/README.md "화면 다시 찍기")
// frontend에서 mock 모드 웹(EXPO_PUBLIC_API_URL= npx expo start --web)을 띄운 뒤 실행한다.
// iPhone 15 Pro 화면(393×852pt, 3배)과 안전 영역(위 59 · 아래 34pt)을 흉내 내어 실제 휴대폰과 같은 배치로 찍는다.
// 사용: node scripts/capture-screens.mjs <저장 폴더> [이름,이름]
import { chromium } from 'playwright';
const out = process.argv[2];
const only = process.argv[3];
const B = 'http://localhost:8081';
const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

async function session(colorScheme) {
  const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, colorScheme, locale: 'ko-KR', timezoneId: 'Asia/Seoul' });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 59, topMax: 59, bottom: 34, bottomMax: 34, left: 0, leftMax: 0, right: 0, rightMax: 0 } });
  await p.goto(B + '/signup', { waitUntil: 'networkidle', timeout: 120000 });
  await p.waitForTimeout(1200);
  const inputs = p.locator('input:visible');
  await inputs.nth(0).fill('runner@example.com'); await inputs.nth(1).fill('dallimo1234'); await inputs.nth(2).fill('새벽러너');
  await p.getByText('가입하고 시작하기').click(); await p.waitForTimeout(2500);
  for (const t of ['나중에 할게요', '건너뛰기', '나중에 할게요', '이대로 시작하기', '시작하기']) {
    const l = p.getByText(t, { exact: true });
    if (await l.count()) { await l.first().click().catch(() => {}); await p.waitForTimeout(1000); }
  }
  return p;
}
async function shot(p, name, path, wait = 2500, after) {
  if (only && !only.split(',').includes(name)) return;
  await p.goto(B + path, { waitUntil: 'networkidle' }).catch(() => {});
  await p.waitForTimeout(wait);
  if (after) await after(p);
  await p.screenshot({ path: `${out}/${name}.png` });
  console.log(name, p.url());
}

const light = await session('light');
await shot(light, 'explore', '/');
await shot(light, 'course', '/course/c-suseongmot');
await shot(light, 'ranking', '/course/c-suseongmot/ranking');
await shot(light, 'together', '/together');
await shot(light, 'room', '/together/r-evening');
// 함께 달리기 mock은 실제 시간으로 움직여서 오래 기다린다
await shot(light, 'live', '/together/r-evening/live', 40000);
// 서버 검증 흉내(약 4.5초)가 끝나 "공식 기록 인증됨"이 보일 때까지 기다린다
await shot(light, 'result', '/run/result?demo=pb', 9000);
await shot(light, 'activity', '/my/activity');
// mock 러너를 6배속으로 30초 달린 코스 러닝 (0.50km 안팎)
await shot(light, 'run', '/run/active?mode=COURSE&courseId=c-suseongmot&courseName=%EC%88%98%EC%84%B1%EB%AA%BB%20%EB%91%98%EB%A0%88%EA%B8%B8&speed=6', 30000);
await b.close();
