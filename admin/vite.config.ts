import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// 달리모 관리 웹 (결정 로그 85항). 정적 사이트로 빌드해 Netlify에 따로 올린다. 주소는 해시(#/users)라 서버 설정이 필요 없다
export default defineConfig({
  plugins: [react()],
});
