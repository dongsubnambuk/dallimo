import { resolve } from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';

// 달리모 소개 사이트 (결정 로그 68항). 페이지마다 HTML을 따로 만들어 정적 호스팅에서 주소 그대로 열리게 한다.
const PAGES = {
  home: 'index.html',
  privacy: 'privacy/index.html',
  terms: 'terms/index.html',
  location: 'location-terms/index.html',
  support: 'support/index.html',
  notFound: '404.html',
};

// SITE_URL(예: https://dallimo.app)이 있으면 canonical · og:url · og:image · sitemap.xml을 넣는다. robots.txt는 늘 만든다
function siteUrl(siteUrl: string | undefined): Plugin {
  const base = siteUrl?.replace(/\/+$/, '');
  return {
    name: 'dallimo-site-url',
    transformIndexHtml(html, ctx) {
      if (!base) return html.replace('%CANONICAL%', '');
      const path = ctx.path.replace(/index\.html$/, '');
      const tags = `<link rel="canonical" href="${base}${path}">\n    <meta property="og:url" content="${base}${path}">\n    <meta property="og:image" content="${base}/og.png">`;
      return html.replace('%CANONICAL%', tags);
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\n${base ? `Sitemap: ${base}/sitemap.xml\n` : ''}` });
      if (!base) return;
      const urls = ['/', '/privacy/', '/terms/', '/location-terms/', '/support/'];
      const body = urls.map((u) => `  <url><loc>${base}${u}</loc></url>`).join('\n');
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n` });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss(), siteUrl(env.SITE_URL)],
    resolve: {
      // 약관 본문은 앱 코드 한 곳에만 둔다 (frontend/src/features/settings/legal)
      alias: { '@legal': resolve(import.meta.dirname, '../frontend/src/features/settings/legal') },
    },
    server: { fs: { allow: ['..'] } },
    build: {
      rollupOptions: { input: Object.fromEntries(Object.entries(PAGES).map(([k, v]) => [k, resolve(import.meta.dirname, v)])) },
    },
  };
});
