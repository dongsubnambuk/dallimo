import { LOCATION_TERMS } from '@legal/location';
import { PRIVACY_POLICY } from '@legal/privacy';
import { TERMS_OF_SERVICE } from '@legal/terms';
import { domAnimation, LazyMotion } from 'motion/react';
import type { ReactNode } from 'react';

import { Home } from '../pages/Home';
import { LegalPage } from '../pages/LegalPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { SupportPage } from '../pages/SupportPage';

// 페이지 이름 → 화면. 빌드 때 HTML로 미리 그리고(scripts/prerender.mjs) 브라우저에서 이어 붙인다(hydrate)
export const PAGES = {
  home: () => <Home />,
  privacy: () => <LegalPage doc={PRIVACY_POLICY} />,
  terms: () => <LegalPage doc={TERMS_OF_SERVICE} />,
  location: () => <LegalPage doc={LOCATION_TERMS} />,
  support: () => <SupportPage />,
  notFound: () => <NotFoundPage />,
} satisfies Record<string, () => ReactNode>;

export type PageName = keyof typeof PAGES;

// motion은 필요한 기능만 불러온다 (LazyMotion + m)
export function App({ page }: { page: PageName }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {PAGES[page]()}
    </LazyMotion>
  );
}
