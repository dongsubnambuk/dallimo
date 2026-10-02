// App Store 스크린샷 8장을 out/store/에 PNG로 만든다 (6.9인치 1320×2868, docs/store/APP-STORE.md)
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

mkdirSync('out/store', { recursive: true });
for (let i = 1; i <= 8; i++) {
  execFileSync('npx', ['remotion', 'still', `Store${i}`, `out/store/${String(i).padStart(2, '0')}.png`, '--image-format=png'], { stdio: 'inherit' });
}
