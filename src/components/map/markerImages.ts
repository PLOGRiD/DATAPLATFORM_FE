// 품목별 마커 SVG를 data URI로 만들어 MarkerImage로 재사용한다.

const cache = new Map<string, kakao.maps.MarkerImage>();

function svgUri(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** 단일 마커: 지름 12px 원 + 얇은 테두리 0.8px (이미지 14×14, offset 7,7) */
export function markerImage(color: string, ring: string) {
  const key = `1|${color}|${ring}`;
  let img = cache.get(key);
  if (!img) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5.6" fill="${color}" stroke="${ring}" stroke-width="0.8"/></svg>`;
    img = new kakao.maps.MarkerImage(svgUri(svg), new kakao.maps.Size(14, 14), { offset: new kakao.maps.Point(7, 7) });
    cache.set(key, img);
  }
  return img;
}

/** 같은 좌표 여러 건: 마커 + 오른쪽 위 6px에 13px 건수 배지 */
export function stackedMarkerImage(color: string, ring: string, count: number, badgeBg: string, badgeFg: string) {
  const label = count > 99 ? '99+' : String(count);
  const key = `n|${color}|${ring}|${label}|${badgeBg}|${badgeFg}`;
  let img = cache.get(key);
  if (!img) {
    const fs = label.length >= 3 ? 6.5 : 8.5;
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">` +
      `<circle cx="14" cy="14" r="5.6" fill="${color}" stroke="${ring}" stroke-width="0.8"/>` +
      `<circle cx="20" cy="8" r="6.5" fill="${badgeBg}" stroke="${ring}" stroke-width="0.6"/>` +
      `<text x="20" y="8" dy="0.35em" text-anchor="middle" font-family="Pretendard, 'Malgun Gothic', sans-serif" font-size="${fs}" font-weight="700" fill="${badgeFg}">${label}</text>` +
      `</svg>`;
    img = new kakao.maps.MarkerImage(svgUri(svg), new kakao.maps.Size(28, 28), { offset: new kakao.maps.Point(14, 14) });
    cache.set(key, img);
  }
  return img;
}

/** 쓰레기통 마커 색: 로고의 회녹색(품목 색과 겹치지 않게) */
export const BIN_COLOR = '#779087';

/** 쓰레기통 아이콘(18px 둥근 사각형 안에 휴지통 모양). (cx, cy) = 사각형 중심 */
function binGlyph(cx: number, cy: number, fill: string, fg: string, ring: string) {
  const x = cx - 9;
  const y = cy - 9;
  return (
    `<rect x="${x}" y="${y}" width="18" height="18" rx="4" fill="${fill}" stroke="${ring}" stroke-width="0.8"/>` +
    `<rect x="${x + 7.5}" y="${y + 3.6}" width="3" height="1.4" rx="0.5" fill="${fg}"/>` +
    `<rect x="${x + 4.8}" y="${y + 5}" width="8.4" height="1.5" rx="0.6" fill="${fg}"/>` +
    `<path d="M${x + 5.8} ${y + 7.4}h6.4l-0.7 7.1h-5z" fill="${fg}"/>`
  );
}

/** 쓰레기통 마커. 같은 자리에 여러 개면 오른쪽 위에 개수 배지 */
export function binMarkerImage(ring: string, count: number, badgeBg: string, badgeFg: string) {
  const label = count > 99 ? '99+' : String(count);
  const key = `bin|${ring}|${count > 1 ? label : 1}|${badgeBg}|${badgeFg}`;
  let img = cache.get(key);
  if (!img) {
    if (count <= 1) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">${binGlyph(10, 10, BIN_COLOR, '#FFFFFF', ring)}</svg>`;
      img = new kakao.maps.MarkerImage(svgUri(svg), new kakao.maps.Size(20, 20), { offset: new kakao.maps.Point(10, 10) });
    } else {
      const fs = label.length >= 3 ? 6.5 : 8.5;
      const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">` +
        binGlyph(14, 18, BIN_COLOR, '#FFFFFF', ring) +
        `<circle cx="24" cy="8" r="6.5" fill="${badgeBg}" stroke="${ring}" stroke-width="0.6"/>` +
        `<text x="24" y="8" dy="0.35em" text-anchor="middle" font-family="Pretendard, 'Malgun Gothic', sans-serif" font-size="${fs}" font-weight="700" fill="${badgeFg}">${label}</text>` +
        `</svg>`;
      img = new kakao.maps.MarkerImage(svgUri(svg), new kakao.maps.Size(32, 32), { offset: new kakao.maps.Point(14, 18) });
    }
    cache.set(key, img);
  }
  return img;
}

/** 범례용 같은 아이콘(HTML <img>에 쓰는 data URI) */
export const BIN_ICON_URI = svgUri(
  `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">${binGlyph(10, 10, BIN_COLOR, '#FFFFFF', 'none')}</svg>`,
);

/** 숫자 원 크기: 10건 미만 28 / 100건 미만 36 / 그 이상 44 */
export function circleSize(n: number) {
  return n < 10 ? 28 : n < 100 ? 36 : 44;
}
