import { delay, http, HttpResponse } from 'msw';
import type {
  DailyHourlyCountsResponse, MapInsightsResponse, StatsResponse, SubCategoryCode, TrashBin, TrashBinsResponse,
  TrashGridResponse, TrashImageResponse, TrashPoint, TrashPointsResponse,
} from '../api/types';
import trashBinsJson from './trashBins.json';
import { bucket, buildIndex, nearestM, topCellM } from './geo';

/** 목업 공공 쓰레기통(공공데이터포털 전국휴지통표준데이터 3,844건) */
const trashBins = trashBinsJson as TrashBin[];
import { ALL_SUB_KEYS, CATEGORIES, isSubKey } from '../lib/categories';
import { addDays, daysInclusive, DOW_CODES, dowOf, inHourRange, isValidDate, nowKst, MAX_RANGE_DAYS } from '../lib/time';
import { collectedAt, dayIndexRange, getStore, type MockStore } from './data';

const ok = <T,>(result: T) =>
  HttpResponse.json({ isSuccess: true, code: 'COMMON200', message: '성공적으로 요청을 처리했습니다.', result });

const fail = (status: number, code: string, message: string) =>
  HttpResponse.json({ isSuccess: false, code, message }, { status });

class BadRequest extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function parsePeriod(q: URLSearchParams) {
  const from = q.get('from');
  const to = q.get('to');
  if (!isValidDate(from) || !isValidDate(to)) throw new BadRequest('COMMON400', 'from, to는 YYYY-MM-DD 형식이어야 합니다.');
  if (from > to) throw new BadRequest('DASHBOARD400_2', 'from은 to보다 늦을 수 없습니다.');
  if (daysInclusive(from, to) > MAX_RANGE_DAYS) throw new BadRequest('DASHBOARD400_3', '기간은 366일을 넘을 수 없습니다.');
  return { from, to };
}

function parseBbox(q: URLSearchParams) {
  const raw = q.get('bbox');
  const parts = raw?.split(',').map(Number);
  if (!parts || parts.length !== 4 || parts.some((v) => !Number.isFinite(v))) {
    throw new BadRequest('DASHBOARD400_1', 'bbox는 minLng,minLat,maxLng,maxLat 형식이어야 합니다.');
  }
  const [minLng, minLat, maxLng, maxLat] = parts;
  if (Math.abs(minLng) > 180 || Math.abs(maxLng) > 180 || Math.abs(minLat) > 90 || Math.abs(maxLat) > 90 || minLng > maxLng || minLat > maxLat) {
    throw new BadRequest('DASHBOARD400_1', 'bbox 범위가 올바르지 않습니다.');
  }
  return { minLng, minLat, maxLng, maxLat };
}

function parseHours(q: URLSearchParams) {
  const a = q.get('hourFrom');
  const b = q.get('hourTo');
  if (a === null && b === null) return null;
  if (a === null || b === null) throw new BadRequest('DASHBOARD400_4', 'hourFrom과 hourTo는 함께 보내야 합니다.');
  const hs = Number(a);
  const he = Number(b);
  if (!Number.isInteger(hs) || !Number.isInteger(he) || hs < 0 || hs > 24 || he < 0 || he > 24 || hs === he) {
    throw new BadRequest('DASHBOARD400_4', 'hourFrom/hourTo 값이 올바르지 않습니다.');
  }
  return { hs, he };
}

function parseDows(q: URLSearchParams) {
  const raw = q.get('dows');
  if (raw === null) return null;
  const set = new Set<number>();
  for (const v of raw.split(',')) {
    const i = DOW_CODES.indexOf(v);
    if (i < 0) throw new BadRequest('DASHBOARD400_5', `알 수 없는 요일: ${v}`);
    set.add(i + 1);
  }
  return set;
}

function parseSubs(q: URLSearchParams) {
  const raw = q.get('subCategories');
  if (raw === null) return null;
  const mask = new Array<boolean>(ALL_SUB_KEYS.length).fill(false);
  const items = raw.split(',');
  if (raw === '' || items.some((v) => v === '')) throw new BadRequest('DASHBOARD400_6', 'subCategories가 비어 있습니다.');
  for (const v of items) {
    if (!isSubKey(v)) throw new BadRequest('DASHBOARD400_6', `알 수 없는 세부 품목: ${v}`);
    mask[ALL_SUB_KEYS.indexOf(v)] = true;
  }
  return mask;
}

function parseLevel(q: URLSearchParams) {
  const v = Number(q.get('level'));
  if (!Number.isInteger(v) || v < 1 || v > 14) throw new BadRequest('DASHBOARD400_7', 'level은 1~14여야 합니다.');
  return v;
}

function handle(fn: (url: URL) => Response | object) {
  return async ({ request }: { request: Request }) => {
    await delay(120 + Math.random() * 180);
    try {
      const r = fn(new URL(request.url));
      return r instanceof Response ? r : ok(r);
    } catch (e) {
      if (e instanceof BadRequest) return fail(400, e.code, e.message);
      console.error(e);
      return fail(500, 'COMMON500', '서버 오류');
    }
  };
}

function inBbox(s: MockStore, i: number, b: ReturnType<typeof parseBbox>) {
  return s.lng[i] >= b.minLng && s.lng[i] <= b.maxLng && s.lat[i] >= b.minLat && s.lat[i] <= b.maxLat;
}

function recordRange(s: MockStore, from: string, to: string) {
  const { a, b } = dayIndexRange(s, from, to);
  if (a > b) return { start: 0, end: 0 };
  return { start: s.dayStart[a], end: s.dayStart[b + 1] };
}

/* ---------- ① stats ---------- */
function aggregate(s: MockStore, from: string, to: string) {
  const { start, end } = recordRange(s, from, to);
  const byHour = new Array(24).fill(0);
  const byCat = new Array(CATEGORIES.length).fill(0);
  const bySub = new Map<string, number>();
  const sessions = new Set<number>();
  for (let i = start; i < end; i++) {
    byHour[s.hour[i]]++;
    byCat[s.cat[i]]++;
    const key = `${s.cat[i]}|${s.sub[i]}`;
    bySub.set(key, (bySub.get(key) ?? 0) + 1);
    sessions.add(s.session[i]);
  }
  const participants = new Set<number>();
  let km = 0;
  for (const id of sessions) {
    participants.add(s.sessionParticipant[id]);
    km += s.sessionKm[id];
  }
  return { total: end - start, byHour, byCat, bySub, ploggings: sessions.size, participants: participants.size, km };
}

const stats = handle((url) => {
  const { from, to } = parsePeriod(url.searchParams);
  const s = getStore();
  const len = daysInclusive(from, to);
  const prev = { from: addDays(from, -len), to: addDays(from, -1) };
  const cur = aggregate(s, from, to);
  const before = aggregate(s, prev.from, prev.to);
  const now = nowKst();
  const result: StatsResponse = {
    asOf: `${now.date}T${String(now.hour).padStart(2, '0')}:${String(now.minute).padStart(2, '0')}:00+09:00`,
    period: { from, to },
    previousPeriod: prev,
    total: { value: cur.total, previous: before.total },
    participation: {
      ploggings: cur.ploggings,
      participants: cur.participants,
      distanceKm: Math.round(cur.km * 10) / 10,
      previousPloggings: before.ploggings,
    },
    byHour: cur.byHour,
    byCategory: CATEGORIES.map((c, i) => ({ code: c.code, count: cur.byCat[i] })).sort((a, b) => b.count - a.count),
    bySubCategory: [...cur.bySub.entries()]
      .map(([key, count]) => {
        const [ci, si] = key.split('|').map(Number);
        const cat = CATEGORIES[ci];
        return { code: si < 0 ? null : (cat.subs[si].code as SubCategoryCode), category: cat.code, count };
      })
      .sort((a, b) => b.count - a.count),
  };
  return result;
});

/* ---------- ② trash-points ---------- */
const trashPoints = handle((url) => {
  const q = url.searchParams;
  const bbox = parseBbox(q);
  const { from, to } = parsePeriod(q);
  const s = getStore();
  const { start, end } = recordRange(s, from, to);
  const points: TrashPoint[] = [];
  let count = 0;
  for (let i = end - 1; i >= start; i--) {
    if (!inBbox(s, i, bbox)) continue;
    count++;
    if (points.length < 5000) {
      const cat = CATEGORIES[s.cat[i]];
      points.push({
        id: i + 1,
        lng: s.lng[i],
        lat: s.lat[i],
        category: cat.code,
        subCategory: s.sub[i] < 0 ? null : cat.subs[s.sub[i]].code,
        collectedAt: collectedAt(s, i),
        dongName: null,
      });
    }
  }
  const result: TrashPointsResponse = {
    count,
    truncated: count > 5000,
    points,
    categories: CATEGORIES.map((c) => ({ code: c.code, name: c.name, subCategories: c.subs.map((x) => ({ ...x })) })),
  };
  return result;
});

/* ---------- ③ trash-grid ---------- */
function cellKmOf(level: number) {
  if (level <= 7) return 0.5;
  if (level <= 10) return 1;
  if (level <= 12) return 5;
  return 20;
}

const trashGrid = handle((url) => {
  const q = url.searchParams;
  const bbox = parseBbox(q);
  const level = parseLevel(q);
  const { from, to } = parsePeriod(q);
  const hours = parseHours(q);
  const dows = parseDows(q);
  const subs = parseSubs(q);
  const s = getStore();
  const { start, end } = recordRange(s, from, to);
  const cellKm = cellKmOf(level);
  const dLat = cellKm / 111;
  const dLng = cellKm / (111 * Math.cos((37.5 * Math.PI) / 180));
  const cells = new Map<string, { lat: number; lng: number; count: number }>();
  for (let i = start; i < end; i++) {
    if (!inBbox(s, i, bbox)) continue;
    if (hours && !inHourRange(s.hour[i], hours.hs, hours.he)) continue;
    if (dows && !dows.has(dowOf(s.days[s.day[i]]))) continue;
    if (subs && !subs[s.subKey[i]]) continue;
    const key = `${Math.floor(s.lat[i] / dLat)}:${Math.floor(s.lng[i] / dLng)}`;
    const c = cells.get(key);
    if (c) {
      c.lat += s.lat[i];
      c.lng += s.lng[i];
      c.count++;
    } else cells.set(key, { lat: s.lat[i], lng: s.lng[i], count: 1 });
  }
  const result: TrashGridResponse = {
    cellKm,
    cells: [...cells.values()].map((c) => ({
      lng: Math.round((c.lng / c.count) * 1e5) / 1e5,
      lat: Math.round((c.lat / c.count) * 1e5) / 1e5,
      count: c.count,
    })),
  };
  return result;
});

/* ---------- ④ image ---------- */
const trashImage = handle((url) => {
  const m = url.pathname.match(/trash-points\/(\d+)\/image$/);
  const id = m ? Number(m[1]) : NaN;
  const s = getStore();
  if (!Number.isInteger(id) || id < 1 || id > s.n) {
    return fail(404, 'TRASH404_1', '수거 기록을 찾을 수 없습니다.');
  }
  const i = id - 1;
  const cat = CATEGORIES[s.cat[i]];
  const shape = i % 3;
  const shapes = [
    `<circle cx="320" cy="240" r="110" fill="${cat.color}"/>`,
    `<rect x="215" y="135" width="210" height="210" rx="18" fill="${cat.color}" transform="rotate(${(i % 40) - 20} 320 240)"/>`,
    `<polygon points="320,110 450,350 190,350" fill="${cat.color}"/>`,
  ];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480"><rect width="640" height="480" fill="#15181e"/><rect x="0" y="380" width="640" height="100" fill="#1d2129"/>${shapes[shape]}<text x="24" y="452" font-family="sans-serif" font-size="22" fill="#8890a0">#${id} · ${cat.name}</text></svg>`;
  const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const result: TrashImageResponse = { thumbnailUrl: dataUrl, imageUrl: dataUrl, expiresAt: null };
  return result;
});

/* ---------- ⑤ daily-hourly-counts ---------- */
const dailyHourly = handle((url) => {
  const q = url.searchParams;
  const bbox = parseBbox(q);
  const { from, to } = parsePeriod(q);
  const dows = parseDows(q);
  const subs = parseSubs(q);
  const s = getStore();
  const n = daysInclusive(from, to);
  const days = Array.from({ length: n }, (_, k) => ({ date: addDays(from, k), hours: new Array<number>(24).fill(0) }));
  const offset = daysInclusive(s.startDate, from) - 1; // 데이터 인덱스 = 응답 인덱스 + offset
  const { start, end } = recordRange(s, from, to);
  for (let i = start; i < end; i++) {
    if (!inBbox(s, i, bbox)) continue;
    if (subs && !subs[s.subKey[i]]) continue;
    const k = s.day[i] - offset;
    const day = days[k];
    if (!day) continue;
    if (dows && !dows.has(dowOf(day.date))) continue;
    day.hours[s.hour[i]]++;
  }
  const result: DailyHourlyCountsResponse = { days };
  return result;
});

/* ---------- ⑥ map-insights ---------- */
const binIndex = buildIndex(trashBins);

const mapInsights = handle((url) => {
  const q = url.searchParams;
  const bbox = parseBbox(q);
  const level = parseLevel(q);
  const { from, to } = parsePeriod(q);
  const hours = parseHours(q);
  const dows = parseDows(q);
  const subs = parseSubs(q);
  const s = getStore();
  const { start, end } = recordRange(s, from, to);

  const pts: { lat: number; lng: number }[] = [];
  const byCat = new Array<number>(CATEGORIES.length).fill(0);
  const bySub = new Map<string, number>();
  for (let i = start; i < end; i++) {
    if (!inBbox(s, i, bbox)) continue;
    if (hours && !inHourRange(s.hour[i], hours.hs, hours.he)) continue;
    if (dows && !dows.has(dowOf(s.days[s.day[i]]))) continue;
    if (subs && !subs[s.subKey[i]]) continue;
    pts.push({ lat: s.lat[i], lng: s.lng[i] });
    byCat[s.cat[i]]++;
    const key = `${s.cat[i]}|${s.sub[i]}`;
    bySub.set(key, (bySub.get(key) ?? 0) + 1);
  }

  const centerLat = (bbox.minLat + bbox.maxLat) / 2;
  const r6 = (v: number) => Math.round(v * 1e6) / 1e6;

  // 쓰레기통이 부족한 곳: 100m 칸, 30건 이상, 1km 안 최근접이 없거나 100m 초과, 상위 5
  const deficitSpots: MapInsightsResponse['deficitSpots'] = [];
  for (const c of bucket(pts, 100, centerLat)) {
    if (c.count < 30) break;
    const d = nearestM(binIndex, c);
    if (d === null || d > 100) {
      deficitSpots.push({ lat: r6(c.lat), lng: r6(c.lng), count: c.count, nearestBinM: d === null ? null : Math.round(d / 10) * 10 });
    }
    if (deficitSpots.length >= 5) break;
  }

  const cellM = topCellM(level);
  const result: MapInsightsResponse = {
    total: pts.length,
    deficitSpots,
    topSpots: {
      cellM,
      spots: bucket(pts, cellM, centerLat)
        .slice(0, 5)
        .map((c) => ({ lat: r6(c.lat), lng: r6(c.lng), count: c.count })),
    },
    byCategory: CATEGORIES.map((c, i) => ({ code: c.code, count: byCat[i] })).sort((a, b) => b.count - a.count),
    bySubCategory: [...bySub.entries()]
      .map(([key, count]) => {
        const [ci, si] = key.split('|').map(Number);
        const cat = CATEGORIES[ci];
        return { code: si < 0 ? null : (cat.subs[si].code as SubCategoryCode), category: cat.code, count };
      })
      .sort((a, b) => b.count - a.count),
  };
  return result;
});

/* ---------- ⑦ trash-bins ---------- */
const trashBinsHandler = handle((url) => {
  const b = parseBbox(url.searchParams);
  const inside = trashBins.filter((x) => x.lng >= b.minLng && x.lng <= b.maxLng && x.lat >= b.minLat && x.lat <= b.maxLat);
  const result: TrashBinsResponse = { count: inside.length, truncated: inside.length > 3000, bins: inside.slice(0, 3000) };
  return HttpResponse.json(
    { isSuccess: true, code: 'COMMON200', message: '성공적으로 요청을 처리했습니다.', result },
    { headers: { 'Cache-Control': 'public, max-age=3600' } },
  );
});

export const handlers = [
  http.get('*/dashboards/map-insights', mapInsights),
  http.get('*/dashboards/trash-bins', trashBinsHandler),
  http.get('*/dashboards/stats', stats),
  http.get('*/dashboards/trash-points/:trashId/image', trashImage),
  http.get('*/dashboards/trash-points', trashPoints),
  http.get('*/dashboards/trash-grid', trashGrid),
  http.get('*/dashboards/daily-hourly-counts', dailyHourly),
];
