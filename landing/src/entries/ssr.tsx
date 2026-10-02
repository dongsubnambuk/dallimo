import { renderToString } from 'react-dom/server';

import { App, PAGES, type PageName } from './pages';

export const PAGE_NAMES = Object.keys(PAGES) as PageName[];

export function render(page: PageName) {
  return renderToString(<App page={page} />);
}
