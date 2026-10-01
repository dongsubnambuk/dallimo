import { m, useReducedMotion } from 'motion/react';

type Props = { d: string; viewBox: string; className?: string; duration?: number; delay?: number; start?: [number, number]; end?: [number, number] };

// 브랜드 경로 선: 앱 지도 코스처럼 짙은 민트 테두리 위에 민트 선. 화면에 들어오면 그려진다
export function RouteLine({ d, viewBox, className, duration = 2.2, delay = 0, start, end }: Props) {
  const reduce = useReducedMotion();
  const draw = reduce ? {} : { initial: { pathLength: 0 }, whileInView: { pathLength: 1 }, viewport: { once: true }, transition: { duration, delay, ease: [0.65, 0, 0.35, 1] as const } };
  return (
    <svg viewBox={viewBox} aria-hidden focusable="false" className={className} fill="none">
      <m.path d={d} stroke="var(--color-signal-deep)" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" {...draw} />
      <m.path d={d} stroke="var(--color-signal)" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" {...draw} />
      {start ? <circle cx={start[0]} cy={start[1]} r={8} fill="var(--color-ink)" stroke="var(--color-signal)" strokeWidth={4} /> : null}
      {end ? (
        <m.circle
          cx={end[0]}
          cy={end[1]}
          r={9}
          fill="var(--color-signal)"
          initial={reduce ? false : { scale: 0, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: reduce ? 0 : delay + duration - 0.1, duration: 0.3 }}
        />
      ) : null}
    </svg>
  );
}
