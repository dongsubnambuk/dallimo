import '../styles.css';

import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';

import { App, type PageName } from './pages';

// 빌드 결과에는 미리 그린 HTML이 들어 있어 이어 붙이고, 개발 서버에서는 새로 그린다
export function mount(page: PageName) {
  const root = document.getElementById('root')!;
  const app = (
    <StrictMode>
      <App page={page} />
    </StrictMode>
  );
  if (root.firstElementChild) hydrateRoot(root, app);
  else createRoot(root).render(app);
}
