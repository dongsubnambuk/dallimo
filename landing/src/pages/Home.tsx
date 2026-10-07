import { SiteShell } from '../components/SiteShell';
import { CompeteSection } from '../sections/CompeteSection';
import { CourseSection } from '../sections/CourseSection';
import { Faq } from '../sections/Faq';
import { FinalCta } from '../sections/FinalCta';
import { Hero } from '../sections/Hero';
import { TogetherSection } from '../sections/TogetherSection';

// 랜딩 (결정 로그 68 · 88항): 첫 화면 → 앱 소개 3장과 같은 세 구간(코스 · 인증 / 겨루기 / 함께 · 기기) → 자주 묻는 질문 → 받기
export function Home() {
  return (
    <SiteShell>
      <Hero />
      <CourseSection />
      <CompeteSection />
      <TogetherSection />
      <Faq />
      <FinalCta />
    </SiteShell>
  );
}
