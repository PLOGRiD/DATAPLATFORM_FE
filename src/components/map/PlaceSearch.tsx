import { useEffect, useId, useRef, useState } from 'react';

interface Result {
  name: string;
  address: string;
  lat: number;
  lng: number;
  level: number;
}

function placeLevel(name: string, categoryGroupCode?: string) {
  return !categoryGroupCode && /(동|읍|면)$/.test(name) ? 5 : 4;
}

/** 키워드 검색 → 없으면 주소 검색 */
function search(query: string): Promise<Result[]> {
  return new Promise((resolve) => {
    const places = new kakao.maps.services.Places();
    places.keywordSearch(
      query,
      (data, status) => {
        if (status === kakao.maps.services.Status.OK && data.length > 0) {
          resolve(
            data.slice(0, 5).map((d) => ({
              name: d.place_name,
              address: d.road_address_name || d.address_name,
              lat: Number(d.y),
              lng: Number(d.x),
              level: placeLevel(d.place_name, d.category_group_code as string | undefined),
            })),
          );
          return;
        }
        const geocoder = new kakao.maps.services.Geocoder();
        geocoder.addressSearch(query, (res, st) => {
          if (st === kakao.maps.services.Status.OK && res.length > 0) {
            resolve(
              res.slice(0, 5).map((r) => ({
                name: r.address_name,
                address: r.road_address?.address_name ?? r.address_name,
                lat: Number(r.y),
                lng: Number(r.x),
                level: placeLevel(r.address_name),
              })),
            );
          } else resolve([]);
        });
      },
      { size: 5 },
    );
  });
}

export function PlaceSearch({ map }: { map: kakao.maps.Map | null }) {
  const listId = useId();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [notFound, setNotFound] = useState(false);
  const seq = useRef(0);
  const skipNext = useRef(false); // 결과를 고른 뒤 입력창에 이름을 넣을 때는 다시 검색하지 않는다
  const wrapRef = useRef<HTMLFormElement>(null);

  const ready = !!map && typeof kakao !== 'undefined' && !!kakao.maps?.services;

  useEffect(() => {
    const q = query.trim();
    if (!q || !ready) return;
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    const my = ++seq.current;
    const timer = window.setTimeout(async () => {
      const r = await search(q);
      if (my !== seq.current) return;
      setResults(r);
      setActive(-1);
      setOpen(r.length > 0);
      setNotFound(r.length === 0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, ready]);

  // 바깥 클릭 시 드롭다운 닫기
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // 지도로 휠·드래그가 넘어가지 않게
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const stop = (e: Event) => e.stopPropagation();
    const evs = ['wheel', 'mousedown', 'touchstart', 'dblclick', 'pointerdown'];
    evs.forEach((ev) => el.addEventListener(ev, stop));
    return () => evs.forEach((ev) => el.removeEventListener(ev, stop));
  }, []);

  const go = (r: Result) => {
    if (!map) return;
    map.setLevel(r.level);
    map.setCenter(new kakao.maps.LatLng(r.lat, r.lng));
    setOpen(false);
    if (r.name !== query) skipNext.current = true;
    setQuery(r.name);
    seq.current++; // 진행 중 검색 결과 무시
  };

  const submit = async () => {
    if (active >= 0 && results[active]) return go(results[active]);
    const q = query.trim();
    if (!q || !ready) return;
    const my = ++seq.current;
    const r = results.length > 0 ? results : await search(q);
    if (my !== seq.current) return;
    if (r.length > 0) go(r[0]);
    else {
      setResults([]);
      setNotFound(true);
    }
  };

  return (
    <form
      ref={wrapRef}
      className="place-search map-float"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      {open && results.length > 0 && (
        <ul className="place-search__list" id={listId} role="listbox" aria-label="검색 결과">
          {results.map((r, i) => (
            <li
              key={`${r.name}-${r.lat}-${r.lng}`}
              role="option"
              aria-selected={i === active}
              className={`place-search__item ${i === active ? 'is-active' : ''}`}
              onClick={() => go(r)}
              onMouseEnter={() => setActive(i)}
            >
              <span className="place-search__name">{r.name}</span>
              <span className="place-search__addr">{r.address}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="place-search__row">
        <input
          type="search"
          className="place-search__input"
          placeholder="지역·장소 검색"
          aria-label="지역·장소 검색"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={undefined}
          value={query}
          disabled={!ready}
          onChange={(e) => {
            setQuery(e.target.value);
            setNotFound(false);
            if (!e.target.value.trim()) {
              setResults([]);
              setOpen(false);
            }
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' && results.length > 0) {
              e.preventDefault();
              setOpen(true);
              setActive((a) => (a + 1) % results.length);
            } else if (e.key === 'ArrowUp' && results.length > 0) {
              e.preventDefault();
              setOpen(true);
              setActive((a) => (a <= 0 ? results.length - 1 : a - 1));
            } else if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
        />
        <button type="submit" className="btn place-search__go" disabled={!ready}>
          이동
        </button>
      </div>
      {notFound && <div className="place-search__empty">찾는 곳이 없습니다</div>}
    </form>
  );
}
