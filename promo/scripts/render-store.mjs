// App Store 스크린샷을 PNG로 만든다 (docs/store/APP-STORE.md): iPhone 6.9인치 1320×2868 8장은 out/store/, Apple Watch 410×502 5장은 out/store/watch/
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

mkdirSync('out/store/watch', { recursive: true });
for (let i = 1; i <= 8; i++) {
  execFileSync('npx', ['remotion', 'still', `Store${i}`, `out/store/${String(i).padStart(2, '0')}.png`, '--image-format=png'], { stdio: 'inherit' });
}
for (let i = 1; i <= 5; i++) {
  execFileSync('npx', ['remotion', 'still', `Watch${i}`, `out/store/watch/${String(i).padStart(2, '0')}.png`, '--image-format=png'], { stdio: 'inherit' });
}
