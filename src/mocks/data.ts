// 목업 수거 기록 생성기: 서울 마포·용산·성동 일대, 올해 1월 1일 ~ 지금(KST)
import type { CategoryCode, SubKey } from '../api/types';
import { ALL_SUB_KEYS, CATEGORIES } from '../lib/categories';
import { addDays, daysInclusive, dowOf, nowKst } from '../lib/time';

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CAT_CODES = CATEGORIES.map((c) => c.code);
const catIdx = (c: CategoryCode) => CAT_CODES.indexOf(c);

type Profile = Partial<Record<CategoryCode, number>>;
const BASE: Profile = { CIGARETTE: 25, PET_BOTTLE: 18, VINYL: 15, CAN: 12, PLASTIC: 8, PAPER: 9, GLASS: 7, STYROFOAM: 6 };
const BAR: Profile = { CIGARETTE: 30, CAN: 16, GLASS: 12, PET_BOTTLE: 13, VINYL: 11, PLASTIC: 6, PAPER: 7, STYROFOAM: 5 };
const PARK: Profile = { PET_BOTTLE: 26, CAN: 17, VINYL: 20, CIGARETTE: 14, PLASTIC: 8, PAPER: 6, GLASS: 4, STYROFOAM: 5 };
const OFFICE: Profile = { CIGARETTE: 38, PET_BOTTLE: 15, VINYL: 12, CAN: 8, PLASTIC: 7, PAPER: 11, GLASS: 3, STYROFOAM: 6 };

interface Spot { lat: number; lng: number; sLat: number; sLng: number; w: number; profile: Profile }
const SPOTS: Spot[] = [
  { lat: 37.5572, lng: 126.9245, sLat: 0.0022, sLng: 0.0026, w: 20, profile: BAR }, // 홍대입구역
  { lat: 37.5495, lng: 126.9139, sLat: 0.0018, sLng: 0.0022, w: 12, profile: BAR }, // 합정역
  { lat: 37.5528, lng: 126.8985, sLat: 0.0014, sLng: 0.0055, w: 14, profile: PARK }, // 망원한강공원
  { lat: 37.5443, lng: 126.9516, sLat: 0.0018, sLng: 0.0022, w: 12, profile: OFFICE }, // 공덕역
  { lat: 37.5615, lng: 126.9235, sLat: 0.0030, sLng: 0.0016, w: 12, profile: BASE }, // 연남동 경의선숲길
  { lat: 37.5446, lng: 127.0559, sLat: 0.0024, sLng: 0.0030, w: 15, profile: BASE }, // 성수역
];
const BACKGROUND_W = 15;
const BG_BOX = { latMin: 37.525, latMax: 37.572, lngMin: 126.89, lngMax: 127.07 };

const SEASON = [0.55, 0.6, 0.85, 1.0, 1.25, 1.0, 0.9, 0.95, 1.25, 1.3, 1.0, 0.8];
//                      0    1    2    3    4    5    6    7    8    9   10   11   12   13   14   15   16   17   18   19   20   21   22   23
const HOUR_BASE = [1.2, 0.7, 0.4, 0.2, 0.3, 1.0, 3.0, 6.5, 7.0, 4.5, 3.2, 3.3, 3.8, 3.5, 3.2, 3.4, 4.2, 5.2, 6.5, 7.0, 6.8, 6.2, 4.0, 2.2];
const NIGHT_CATS = new Set<CategoryCode>(['CIGARETTE', 'CAN', 'GLASS']);

function pickWeighted(rng: () => number, weights: number[]) {
  let total = 0;
  for (const w of weights) total += w;
  let r = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) return i;
  }
  return weights.length - 1;
}

function gauss(rng: () => number) {
  const u = Math.max(rng(), 1e-9);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export interface MockStore {
  startDate: string;
  days: string[];
  dayStart: number[]; // 날짜별 첫 레코드 인덱스 (길이 days+1)
  n: number;
  lng: Float64Array;
  lat: Float64Array;
  cat: Uint8Array;
  sub: Int8Array; // 대분류 내 세부 인덱스, -1 = 미분류
  subKey: Uint8Array; // ALL_SUB_KEYS 인덱스
  day: Uint16Array;
  hour: Uint8Array;
  minute: Uint8Array;
  session: Int32Array;
  sessionParticipant: number[];
  sessionKm: number[];
}

let store: MockStore | null = null;

export function getStore(): MockStore {
  if (store) return store;
  const rng = mulberry32(20261009);
  const now = nowKst();
  const startDate = `${now.date.slice(0, 4)}-01-01`;
  const nDays = daysInclusive(startDate, now.date);
  const nowMinutes = now.hour * 60 + now.minute;

  const subKeyIndex = new Map<SubKey, number>(ALL_SUB_KEYS.map((k, i) => [k, i]));

  const recs: { lng: number; lat: number; cat: number; sub: number; day: number; hour: number; minute: number; session: number }[] = [];
  const days: string[] = [];
  const dayStart: number[] = [];
  const sessionParticipant: number[] = [];
  const sessionKm: number[] = [];

  for (let d = 0; d < nDays; d++) {
    const date = addDays(startDate, d);
    days.push(date);
    dayStart.push(recs.length);
    const month = Number(date.slice(5, 7)) - 1;
    const weekend = dowOf(date) >= 6;
    const expected = 285 * SEASON[month] * (weekend ? 1.5 : 1) * (0.85 + rng() * 0.3);
    const count = Math.round(expected);
    const isToday = date === now.date;

    const dayRecs: typeof recs = [];
    for (let i = 0; i < count; i++) {
      const spotIdx = pickWeighted(rng, [...SPOTS.map((s) => s.w), BACKGROUND_W]);
      const spot = SPOTS[spotIdx];
      const profile = spot?.profile ?? BASE;
      const ci = pickWeighted(rng, CAT_CODES.map((c) => profile[c] ?? 1));
      const code = CAT_CODES[ci];
      const subs = CATEGORIES[ci].subs;
      let sub = -1;
      if (rng() >= 0.05) sub = pickWeighted(rng, subs.map((_, j) => (j === 0 ? 2 : 1)));

      const hw = HOUR_BASE.map((w, h) => {
        let x = w;
        if (weekend && h >= 6 && h <= 10) x *= 1.6;
        if (NIGHT_CATS.has(code) && (h >= 19 || h <= 2)) x *= 1.8;
        return x;
      });
      const hour = pickWeighted(rng, hw);
      const minute = Math.floor(rng() * 60);
      if (isToday && hour * 60 + minute > nowMinutes) continue;

      let lat: number;
      let lng: number;
      if (spot) {
        lat = spot.lat + gauss(rng) * spot.sLat;
        lng = spot.lng + gauss(rng) * spot.sLng;
      } else {
        lat = BG_BOX.latMin + rng() * (BG_BOX.latMax - BG_BOX.latMin);
        lng = BG_BOX.lngMin + rng() * (BG_BOX.lngMax - BG_BOX.lngMin);
      }
      dayRecs.push({
        lng: Math.round(lng * 1e4) / 1e4,
        lat: Math.round(lat * 1e4) / 1e4,
        cat: ci, sub, day: d, hour, minute, session: 0,
      });
    }
    dayRecs.sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));

    // 플로깅 세션: 하루 수거량 ÷ 6.4
    const nSessions = Math.max(1, Math.round(dayRecs.length / 6.4));
    const firstSession = sessionParticipant.length;
    for (let s = 0; s < nSessions; s++) {
      sessionParticipant.push(Math.floor(Math.pow(rng(), 1.5) * 800));
      sessionKm.push(Math.round((1.2 + rng() * 3.3) * 10) / 10);
    }
    for (const r of dayRecs) r.session = firstSession + Math.floor(rng() * nSessions);
    recs.push(...dayRecs);
  }
  dayStart.push(recs.length);

  const n = recs.length;
  const s: MockStore = {
    startDate, days, dayStart, n,
    lng: new Float64Array(n), lat: new Float64Array(n), cat: new Uint8Array(n), sub: new Int8Array(n),
    subKey: new Uint8Array(n), day: new Uint16Array(n), hour: new Uint8Array(n), minute: new Uint8Array(n),
    session: new Int32Array(n), sessionParticipant, sessionKm,
  };
  recs.forEach((r, i) => {
    s.lng[i] = r.lng;
    s.lat[i] = r.lat;
    s.cat[i] = r.cat;
    s.sub[i] = r.sub;
    const cat = CATEGORIES[r.cat];
    const key = (r.sub < 0 ? `${cat.code}:NONE` : cat.subs[r.sub].code) as SubKey;
    s.subKey[i] = subKeyIndex.get(key)!;
    s.day[i] = r.day;
    s.hour[i] = r.hour;
    s.minute[i] = r.minute;
    s.session[i] = r.session;
  });
  store = s;
  return s;
}

/** 날짜 문자열 → 데이터 날짜 인덱스(범위 밖이면 범위로 자름) */
export function dayIndexRange(s: MockStore, from: string, to: string) {
  const a = daysInclusive(s.startDate, from) - 1;
  const b = daysInclusive(s.startDate, to) - 1;
  return { a: Math.max(0, a), b: Math.min(s.days.length - 1, b) };
}

export function collectedAt(s: MockStore, i: number) {
  const hh = String(s.hour[i]).padStart(2, '0');
  const mm = String(s.minute[i]).padStart(2, '0');
  return `${s.days[s.day[i]]}T${hh}:${mm}:00+09:00`;
}

export { CAT_CODES, catIdx };
