import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiGet } from './client';
import type {
  DailyHourlyCountsResponse,
  MapInsightsResponse,
  StatsResponse,
  TrashGridResponse,
  TrashImageResponse,
  TrashBinsResponse,
  TrashPointsResponse,
} from './types';

export function useStats(from: string, to: string) {
  return useQuery({
    queryKey: ['stats', from, to],
    queryFn: ({ signal }) => apiGet<StatsResponse>('/stats', { from, to }, signal),
    staleTime: 10 * 60 * 1000,
  });
}

export function useTrashPoints(p: { bbox: string | null; from: string; to: string; enabled: boolean }) {
  return useQuery({
    queryKey: ['trash-points', p.bbox, p.from, p.to],
    queryFn: ({ signal }) =>
      apiGet<TrashPointsResponse>('/trash-points', { bbox: p.bbox!, from: p.from, to: p.to }, signal),
    enabled: p.enabled && !!p.bbox,
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
}

export function useTrashGrid(p: {
  bbox: string | null; level: number; from: string; to: string;
  hourFrom?: number; hourTo?: number; dows?: string; subCategories?: string; enabled: boolean;
}) {
  return useQuery({
    queryKey: ['trash-grid', p.bbox, p.level, p.from, p.to, p.hourFrom, p.hourTo, p.dows, p.subCategories],
    queryFn: ({ signal }) =>
      apiGet<TrashGridResponse>(
        '/trash-grid',
        {
          bbox: p.bbox!, level: p.level, from: p.from, to: p.to,
          hourFrom: p.hourFrom, hourTo: p.hourTo, dows: p.dows, subCategories: p.subCategories,
        },
        signal,
      ),
    enabled: p.enabled && !!p.bbox,
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
}

export function useDailyHourly(p: {
  bbox: string | null; from: string; to: string; dows?: string; subCategories?: string; enabled: boolean;
}) {
  return useQuery({
    queryKey: ['daily-hourly-counts', p.bbox, p.from, p.to, p.dows, p.subCategories],
    queryFn: ({ signal }) =>
      apiGet<DailyHourlyCountsResponse>(
        '/daily-hourly-counts',
        { bbox: p.bbox!, from: p.from, to: p.to, dows: p.dows, subCategories: p.subCategories },
        signal,
      ),
    enabled: p.enabled && !!p.bbox,
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
}

export function useTrashImage(id: number | null) {
  return useQuery({
    queryKey: ['trash-image', id],
    queryFn: ({ signal }) => apiGet<TrashImageResponse>(`/trash-points/${id}/image`, undefined, signal),
    enabled: id !== null,
    staleTime: (q) => {
      const exp = q.state.data?.expiresAt;
      if (!exp) return Infinity;
      return Math.max(0, new Date(exp).getTime() - Date.now());
    },
    retry: (count, err) => (err as { status?: number }).status !== 404 && count < 2,
  });
}

export function useMapInsights(p: {
  bbox: string | null; level: number; from: string; to: string;
  hourFrom?: number; hourTo?: number; dows?: string; subCategories?: string; enabled: boolean;
}) {
  return useQuery({
    queryKey: ['map-insights', p.bbox, p.level, p.from, p.to, p.hourFrom, p.hourTo, p.dows, p.subCategories],
    queryFn: ({ signal }) =>
      apiGet<MapInsightsResponse>(
        '/map-insights',
        {
          bbox: p.bbox!, level: p.level, from: p.from, to: p.to,
          hourFrom: p.hourFrom, hourTo: p.hourTo, dows: p.dows, subCategories: p.subCategories,
        },
        signal,
      ),
    enabled: p.enabled && !!p.bbox,
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
}

/** 공공 쓰레기통(지도 레벨 1~6에서만). 위치는 거의 안 바뀌어 오래 캐시한다 */
export function useTrashBins(p: { bbox: string | null; enabled: boolean }) {
  return useQuery({
    queryKey: ['trash-bins', p.bbox],
    queryFn: ({ signal }) => apiGet<TrashBinsResponse>('/trash-bins', { bbox: p.bbox! }, signal),
    enabled: p.enabled && !!p.bbox,
    placeholderData: keepPreviousData,
    staleTime: 60 * 60 * 1000,
  });
}
