// 영상에 쓰는 그림 · 글꼴을 public/으로 복사한다 (원본은 한 곳에만 둔다)
// 앱 화면: landing/public/screens (landing/README.md "화면 다시 찍기"), App Store용 원본 크기 화면: promo/assets/store-screens, 아이콘 · 글꼴: frontend/assets
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public');
mkdirSync(join(out, 'screens'), { recursive: true });
mkdirSync(join(out, 'fonts'), { recursive: true });

const screens = join(root, '../landing/public/screens');
for (const f of readdirSync(screens).filter((f) => f.endsWith('.webp') && !f.endsWith('-480.webp'))) copyFileSync(join(screens, f), join(out, 'screens', f));
mkdirSync(join(out, 'store-screens'), { recursive: true });
const store = join(root, 'assets/store-screens');
for (const f of readdirSync(store).filter((f) => f.endsWith('.webp'))) copyFileSync(join(store, f), join(out, 'store-screens', f));
copyFileSync(join(root, '../frontend/assets/images/icon.png'), join(out, 'icon.png'));
for (const w of ['Medium', 'Bold', 'ExtraBold', 'Black']) {
  copyFileSync(join(root, `../frontend/assets/fonts/pretendard/Pretendard-${w}.otf`), join(out, 'fonts', `Pretendard-${w}.otf`));
}
console.log('assets synced');
