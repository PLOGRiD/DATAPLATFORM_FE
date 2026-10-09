import type { SubKey } from '../api/types';
import { CATEGORIES, CATEGORY_BY_CODE, categoryOfSubKey, isNoneKey, subKeyName, subKeysOf } from './categories';
import { DOW_LABELS } from './time';

/** 요일: 1개면 "토요일", 여러 개면 "화·수·목" */
export function dowsText(dows: number[]) {
  if (dows.length === 1) return `${DOW_LABELS[dows[0] - 1]}요일`;
  return dows.map((d) => DOW_LABELS[d - 1]).join('·');
}

/** 품목: 대분류 단위면 "유리 외 2개", 세부로 섞이면 "세부 품목 5개", 1개면 "유리 · 소주병" */
export function subsText(subs: Set<SubKey>) {
  if (subs.size === 0) return '선택 없음';
  const full = CATEGORIES.filter((c) => subKeysOf(c.code).every((k) => subs.has(k)));
  const partial = CATEGORIES.some((c) => {
    const keys = subKeysOf(c.code);
    const on = keys.filter((k) => subs.has(k)).length;
    return on > 0 && on < keys.length;
  });
  if (!partial) {
    return full.length === 1 ? full[0].name : `${full[0].name} 외 ${full.length - 1}개`;
  }
  if (subs.size === 1) {
    const k = [...subs][0];
    const cat = CATEGORY_BY_CODE[categoryOfSubKey(k)].name;
    return isNoneKey(k) ? `${cat} · 미분류` : `${cat} · ${subKeyName(k)}`;
  }
  return `세부 품목 ${subs.size}개`;
}
