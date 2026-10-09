import type { Tokens } from '../../lib/useTokens';

/**
 * 차트 툴팁 공통 모양과 위치.
 * 마우스 오른쪽 아래 14px, 화면 밖으로 나가면 반대쪽으로 뒤집는다.
 */
export function tooltipBase(t: Tokens) {
  return {
    backgroundColor: t.fg,
    borderWidth: 0,
    padding: [7, 10],
    textStyle: { color: t.bg, fontSize: 12, fontFamily: t.font },
    extraCssText: 'border-radius:8px;max-width:240px;white-space:normal;box-shadow:none;',
    transitionDuration: 0,
    position: (point: number[], _params: unknown, dom: unknown) => {
      const el = dom as HTMLElement | undefined;
      const w = el?.offsetWidth ?? 0;
      const h = el?.offsetHeight ?? 0;
      // 툴팁 DOM은 차트 컨테이너 안에 붙는다 → 컨테이너의 화면 위치로 뷰포트 넘침을 판단
      const rect = el?.parentElement?.getBoundingClientRect();
      const ox = rect?.left ?? 0;
      const oy = rect?.top ?? 0;
      let x = point[0] + 14;
      let y = point[1] + 14;
      if (ox + x + w > window.innerWidth - 4) x = point[0] - 14 - w;
      if (oy + y + h > window.innerHeight - 4) y = point[1] - 14 - h;
      return [x, y];
    },
  };
}
