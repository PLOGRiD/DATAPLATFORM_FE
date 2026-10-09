import { useEffect, useState } from 'react';

/** 캔버스(ECharts)·마커 이미지처럼 CSS 변수를 직접 못 쓰는 곳을 위한 현재 테마 색 */
export interface Tokens {
  bg: string; surface: string; surface2: string; line: string; lineStrong: string;
  fg: string; fg2: string; fg3: string; accent: string; chart: string; neutral: string; mutedBar: string;
  markerRing: string; font: string; dark: boolean;
}

function read(): Tokens {
  const cs = getComputedStyle(document.documentElement);
  const v = (name: string) => cs.getPropertyValue(name).trim();
  return {
    bg: v('--bg'), surface: v('--surface'), surface2: v('--surface-2'), line: v('--line'), lineStrong: v('--line-strong'),
    fg: v('--fg'), fg2: v('--fg-2'), fg3: v('--fg-3'), accent: v('--accent'), chart: v('--chart'), neutral: v('--neutral'),
    mutedBar: v('--muted-bar'), markerRing: v('--marker-ring'), font: v('--font'),
    dark: cs.colorScheme.includes('dark'),
  };
}

export function useTokens(): Tokens {
  const [tokens, setTokens] = useState(read);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const refresh = () => setTokens(read());
    mq.addEventListener('change', refresh);
    const mo = new MutationObserver(refresh);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
      mq.removeEventListener('change', refresh);
      mo.disconnect();
    };
  }, []);
  return tokens;
}

/** '#RRGGBB' + 불투명도 → rgba() */
export function withAlpha(hex: string, alpha: number) {
  const m = hex.replace('#', '');
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}
