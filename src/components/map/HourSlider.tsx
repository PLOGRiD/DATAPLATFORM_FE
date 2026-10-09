interface Props {
  hs: number;
  he: number;
  onChange: (hs: number, he: number) => void;
}

/** 시간대 이중 슬라이더(0~24, 1시간). 시작 엄지가 끝보다 오른쪽이면 자정을 넘는 범위. */
export function HourSlider({ hs, he, onChange }: Props) {
  const pct = (v: number) => `${(v / 24) * 100}%`;
  const fills =
    hs < he
      ? [{ left: pct(hs), width: pct(he - hs) }]
      : [
          { left: pct(hs), width: pct(24 - hs) },
          { left: '0%', width: pct(he) },
        ];

  const setStart = (raw: number) => {
    const v = Math.min(raw, 23);
    if (v === he) return;
    onChange(v, he);
  };
  const setEnd = (raw: number) => {
    const v = Math.max(raw, 1);
    if (v === hs) return;
    onChange(hs, v);
  };

  return (
    <div className="hour-slider">
      <div className="hour-slider__track" aria-hidden="true">
        {fills.map((f, i) => (
          <span key={i} className="hour-slider__fill" style={f} />
        ))}
      </div>
      <input
        type="range"
        min={0}
        max={24}
        step={1}
        value={hs}
        aria-label="시간대 시작"
        aria-valuetext={`${hs}시`}
        onChange={(e) => setStart(Number(e.target.value))}
      />
      <input
        type="range"
        min={0}
        max={24}
        step={1}
        value={he}
        aria-label="시간대 끝"
        aria-valuetext={`${he}시`}
        onChange={(e) => setEnd(Number(e.target.value))}
      />
    </div>
  );
}
