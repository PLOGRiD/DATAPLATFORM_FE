export type CategoryCode = 'CIGARETTE' | 'VINYL' | 'PLASTIC' | 'PET_BOTTLE' | 'CAN' | 'GLASS' | 'PAPER' | 'STYROFOAM';
export type SubCategoryCode =
  | 'CIGARETTE_BUTT' | 'PACKAGING_BAG' | 'PLASTIC_BAG' | 'AIR_CAP'
  | 'FOOD_TRAY' | 'STYROFOAM' | 'FOOD_CONTAINER'
  | 'OTHER_BOTTLE' | 'BEER_BOTTLE' | 'TONIC_BOTTLE' | 'SOJU_BOTTLE' | 'BEVERAGE_BOTTLE' | 'KITCHEN_CONTAINER'
  | 'BOX' | 'BEVERAGE_CARTON' | 'PAPER_BAG' | 'BOOK'
  | 'BEER_CAN' | 'CAN' | 'DRINK_CAN' | 'COFFEE_CAN' | 'TIN_CAN'
  | 'DISPOSABLE_DRINK_CUP' | 'PET_BOTTLE'
  | 'LARGE_PLASTIC_CONTAINER' | 'WASTE_CONTAINER';

/** 필터 상태의 한 칸: 세부 품목 코드 또는 `대분류:NONE`(미분류) */
export type SubKey = SubCategoryCode | `${CategoryCode}:NONE`;

export interface ApiResponse<T> { isSuccess: boolean; code: string; message: string; result?: T }

export interface Period { from: string; to: string } // YYYY-MM-DD

export interface StatsResponse {
  asOf: string;
  period: Period;
  previousPeriod: Period;
  total: { value: number; previous: number };
  participation: { ploggings: number; participants: number; distanceKm: number; previousPloggings: number };
  byHour: number[]; // 길이 24
  byCategory: { code: CategoryCode; count: number }[]; // 8개 전부, 많은 순
  bySubCategory: { code: SubCategoryCode | null; category: CategoryCode; count: number }[]; // 많은 순, null = 미분류
}

export interface TrashPoint {
  id: number; lng: number; lat: number;
  category: CategoryCode; subCategory: SubCategoryCode | null;
  collectedAt: string; // +09:00
  dongName: string | null; // 현재 항상 null
}
export interface TrashPointsResponse {
  count: number; truncated: boolean;
  points: TrashPoint[];
  categories: { code: CategoryCode; name: string; subCategories: { code: SubCategoryCode; name: string }[] }[];
}

export interface TrashGridResponse { cellKm: number; cells: { lng: number; lat: number; count: number }[] }

export interface TrashImageResponse { thumbnailUrl: string; imageUrl: string; expiresAt: string | null }

export interface DailyHourlyCountsResponse { days: { date: string; hours: number[] }[] } // 기간 전체 날짜, hours 길이 24

export interface DashboardQuery { // 8-2 변환 결과
  bbox: string; from: string; to: string; level?: number;
  hourFrom?: number; hourTo?: number; dows?: string; subCategories?: string;
}

// 6. 지도 범위 분석
export interface MapInsightsResponse {
  total: number;
  deficitSpots: { lat: number; lng: number; count: number; nearestBinM: number | null }[];
  topSpots: { cellM: number; spots: { lat: number; lng: number; count: number }[] };
  byCategory: { code: CategoryCode; count: number }[];
  bySubCategory: { code: SubCategoryCode | null; category: CategoryCode; count: number }[];
}

// 7. 공공 쓰레기통
export interface TrashBin {
  id: number; lat: number; lng: number;
  roadAddress: string | null; jibunAddress: string | null;
  managingOrg: string | null; managingOrgPhone: string | null;
  dataDate: string | null; // YYYY-MM-DD
}
export interface TrashBinsResponse { count: number; truncated: boolean; bins: TrashBin[] }
