import { animate, m, useInView, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { useEffect, useRef } from 'react';

type Props = { to: number; format: (v: number) => string; duration?: number; className?: string };

// 화면에 들어오면 0부터 목표값까지 센다. 값은 motion value로만 바뀌어 React 렌더를 다시 하지 않는다
export function Counter({ to, format, duration = 1.4, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const reduce = useReducedMotion();
  const mv = useMotionValue(reduce ? to : 0);
  const text = useTransform(mv, format);
  useEffect(() => {
    if (!inView || reduce) return;
    const controls = animate(mv, to, { duration, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [inView, reduce, mv, to, duration]);
  return (
    <m.span ref={ref} className={className} aria-label={format(to)}>
      {text}
    </m.span>
  );
}

export const fmtKm = (v: number) => v.toFixed(2);
export const fmtClock = (sec: number) => {
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
export const fmtPace = (sec: number) => {
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}'${String(s % 60).padStart(2, '0')}"`;
};
