import { SiteShell } from '../components/SiteShell';
import { CourseStory } from '../sections/CourseStory';
import { Faq } from '../sections/Faq';
import { Features } from '../sections/Features';
import { FinalCta } from '../sections/FinalCta';
import { Hero } from '../sections/Hero';
import { Loop } from '../sections/Loop';
import { Privacy } from '../sections/Privacy';
import { RunSection } from '../sections/RunSection';
import { TogetherSection } from '../sections/TogetherSection';

export function Home() {
  return (
    <SiteShell>
      <Hero />
      <Loop />
      <CourseStory />
      <RunSection />
      <TogetherSection />
      <Features />
      <Privacy />
      <Faq />
      <FinalCta />
    </SiteShell>
  );
}
