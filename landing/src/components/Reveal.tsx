import { m, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

type Props = { children: ReactNode; delay?: number; className?: string; y?: number };

// 화면에 들어오면 아래에서 살짝 올라오며 나타난다. 동작 줄이기 설정이면 그대로 보인다
export function Reveal({ children, delay = 0, className, y = 16 }: Props) {
  const reduce = useReducedMotion();
  return (
    <m.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.55, ease: [0.25, 1, 0.5, 1], delay }}
    >
      {children}
    </m.div>
  );
}
