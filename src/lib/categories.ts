import type { CategoryCode, SubCategoryCode, SubKey, TrashPoint, TrashPointsResponse } from '../api/types';

export interface CategoryDef {
  code: CategoryCode;
  name: string;
  color: string;
  subs: { code: SubCategoryCode; name: string }[];
}

/** 대분류 8개(필터·범례 표시 순서)와 고정색. 라이트·다크 공통. */
export const CATEGORIES: CategoryDef[] = [
  { code: 'CIGARETTE', name: '담배', color: '#E45756', subs: [{ code: 'CIGARETTE_BUTT', name: '담배꽁초' }] },
  {
    code: 'VINYL', name: '비닐', color: '#B279A2',
    subs: [
      { code: 'PACKAGING_BAG', name: '포장봉지' },
      { code: 'PLASTIC_BAG', name: '봉투' },
      { code: 'AIR_CAP', name: '에어캡' },
    ],
  },
  {
    code: 'PLASTIC', name: '플라스틱', color: '#4C78A8',
    subs: [
      { code: 'LARGE_PLASTIC_CONTAINER', name: '대용량플라스틱통' },
      { code: 'WASTE_CONTAINER', name: '밀폐용기' },
    ],
  },
  {
    code: 'PET_BOTTLE', name: '페트병', color: '#72B7B2',
    subs: [
      { code: 'DISPOSABLE_DRINK_CUP', name: '일회용음료수잔' },
      { code: 'PET_BOTTLE', name: '페트병' },
    ],
  },
  {
    code: 'CAN', name: '캔', color: '#F58518',
    subs: [
      { code: 'BEER_CAN', name: '맥주캔' },
      { code: 'CAN', name: '스팸류' },
      { code: 'DRINK_CAN', name: '음료수캔' },
      { code: 'COFFEE_CAN', name: '커피캔' },
      { code: 'TIN_CAN', name: '통조림캔' },
    ],
  },
  {
    code: 'GLASS', name: '유리', color: '#54A24B',
    subs: [
      { code: 'OTHER_BOTTLE', name: '기타술병' },
      { code: 'BEER_BOTTLE', name: '맥주병' },
      { code: 'TONIC_BOTTLE', name: '박카스병' },
      { code: 'SOJU_BOTTLE', name: '소주병' },
      { code: 'BEVERAGE_BOTTLE', name: '음료수병' },
      { code: 'KITCHEN_CONTAINER', name: '주방용기' },
    ],
  },
  {
    code: 'PAPER', name: '종이', color: '#EECA3B',
    subs: [
      { code: 'BOX', name: '종이상자' },
      { code: 'BEVERAGE_CARTON', name: '음료수곽' },
      { code: 'PAPER_BAG', name: '종이봉투' },
      { code: 'BOOK', name: '책자' },
    ],
  },
  {
    code: 'STYROFOAM', name: '스티로폼', color: '#9D755D',
    subs: [
      { code: 'FOOD_TRAY', name: '네모트레이' },
      { code: 'STYROFOAM', name: '스티로폼' },
      { code: 'FOOD_CONTAINER', name: '포장용기' },
    ],
  },
];

export const CATEGORY_BY_CODE = Object.fromEntries(CATEGORIES.map((c) => [c.code, c])) as Record<CategoryCode, CategoryDef>;

const subNames = new Map<string, string>();
const subCategoryOf = new Map<string, CategoryCode>();
for (const c of CATEGORIES) {
  for (const s of c.subs) {
    subNames.set(s.code, s.name);
    subCategoryOf.set(s.code, c.code);
  }
  subCategoryOf.set(`${c.code}:NONE`, c.code);
}

/** 서버 응답의 categories 사전으로 표시명을 갱신한다(서버 우선). */
export function applyServerNames(dict: TrashPointsResponse['categories'] | undefined) {
  if (!dict) return;
  for (const c of dict) {
    const def = CATEGORY_BY_CODE[c.code];
    if (!def) continue;
    def.name = c.name;
    for (const s of c.subCategories) {
      subNames.set(s.code, s.name);
      const local = def.subs.find((x) => x.code === s.code);
      if (local) local.name = s.name;
    }
  }
}

/** 카테고리마다 세부 품목 + 마지막에 미분류 */
export function subKeysOf(cat: CategoryCode): SubKey[] {
  return [...CATEGORY_BY_CODE[cat].subs.map((s) => s.code as SubKey), `${cat}:NONE` as SubKey];
}

/** 34칸 전체(표시 순서) */
export const ALL_SUB_KEYS: SubKey[] = CATEGORIES.flatMap((c) => subKeysOf(c.code));
const ALL_SUB_KEY_SET = new Set<string>(ALL_SUB_KEYS);

export function isSubKey(v: string): v is SubKey {
  return ALL_SUB_KEY_SET.has(v);
}

export function categoryOfSubKey(key: SubKey): CategoryCode {
  return subCategoryOf.get(key)!;
}

export function isNoneKey(key: SubKey) {
  return key.endsWith(':NONE');
}

export function subKeyName(key: SubKey): string {
  return isNoneKey(key) ? '미분류' : subNames.get(key) ?? key;
}

export function subKeyOfPoint(p: Pick<TrashPoint, 'category' | 'subCategory'>): SubKey {
  return p.subCategory ?? (`${p.category}:NONE` as SubKey);
}

/** "유리 · 소주병" / "유리 · 세부 미분류" */
export function itemLabel(category: CategoryCode, sub: SubCategoryCode | null): string {
  const cat = CATEGORY_BY_CODE[category]?.name ?? category;
  return sub ? `${cat} · ${subNames.get(sub) ?? sub}` : `${cat} · 세부 미분류`;
}

export function subCodeName(code: SubCategoryCode | null): string {
  return code ? subNames.get(code) ?? code : '미분류';
}
