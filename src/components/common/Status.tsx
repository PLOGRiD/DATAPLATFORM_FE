import type { CSSProperties } from 'react';
import { ApiError } from '../../api/client';

export function Skeleton({ height, style }: { height: number | string; style?: CSSProperties }) {
  return <div className="skeleton" style={{ height, ...style }} aria-hidden="true" />;
}

/** 원인 파악용 짧은 설명: HTTP 상태·오류 코드, 또는 네트워크 오류 */
function errorDetail(error: unknown) {
  if (error instanceof ApiError) return [`HTTP ${error.status}`, error.code].filter(Boolean).join(' · ');
  if (error instanceof TypeError) return '서버에 연결할 수 없음';
  return undefined;
}

export function ErrorBox({ onRetry, height, error }: { onRetry: () => void; height?: number | string; error?: unknown }) {
  const detail = errorDetail(error);
  return (
    <div className="error-box" role="alert" style={{ minHeight: height }}>
      <span>데이터를 불러오지 못했습니다</span>
      {detail && <span className="error-box__detail num">{detail}</span>}
      <button type="button" className="btn" onClick={onRetry}>
        다시 시도
      </button>
    </div>
  );
}
