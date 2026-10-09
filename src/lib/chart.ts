/** 7일 이동평균(앞 6일은 있는 날만으로) */
export function movingAverage(values: number[], win = 7) {
  return values.map((_, i) => {
    const s = Math.max(0, i - win + 1);
    const slice = values.slice(s, i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

/** 일별 추이 표시 규칙: 45일 초과 = 7일 평균선, 92일 이하 = 주말 띠, 31일 이하 = 날마다 점 */
export function dailyFlags(n: number) {
  return { long: n > 45, weekends: n <= 92, dots: n <= 31 };
}

