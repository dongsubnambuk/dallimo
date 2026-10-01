import type { ReactNode } from 'react';

import { Footer } from './Footer';
import { Nav } from './Nav';

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <>
      <Nav />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
