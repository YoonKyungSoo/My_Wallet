import { loadApprovedRestaurants } from '../lib/approvedRestaurants';
import { isApiConfigured } from '../lib/api';
import { getServerRestaurantsCache } from '../lib/restaurantApi';
import { getRestaurantDetailOverride } from '../lib/restaurantDetailOverrides';

const KRW = new Intl.NumberFormat('ko-KR');

export function formatWon(n) {
  return `${KRW.format(Math.max(0, Math.round(n)))}원`;
}

export function averagePriceRange(menuPrices = []) {
  if (!menuPrices?.length) return '정보 없음';
  const low = Math.min(...menuPrices);
  const high = Math.max(...menuPrices);
  if (low === high) return formatWon(low);
  return `${formatWon(low)}~${formatWon(high)}`;
}

/** 코드에 박아 넣은 기본 식당 없음 — 관리자 승인 식당만 `loadApprovedRestaurants()` 로 합쳐짐 */
export const MAIN_RESTAURANTS = [];

/** 승인 식당 + (비어 있으면 빈 목록). API 모드면 서버 캐시만 사용 */
export function getAllRestaurants() {
  if (isApiConfigured()) {
    return [...MAIN_RESTAURANTS, ...getServerRestaurantsCache()];
  }
  return [...MAIN_RESTAURANTS, ...loadApprovedRestaurants()];
}

export function getRestaurantByName(name) {
  if (!name || typeof name !== 'string') return null;
  const base = getAllRestaurants().find((r) => r.name === name) || null;
  if (!base) return null;
  if (base.approvedId) return base;
  const ov = getRestaurantDetailOverride(name);
  if (!ov) return base;
  return {
    ...base,
    ...(ov.address !== undefined ? { address: ov.address } : {}),
    ...(ov.category !== undefined ? { category: ov.category } : {}),
    ...(ov.rating !== undefined ? { rating: String(ov.rating) } : {}),
    ...(ov.phone !== undefined ? { phone: ov.phone } : {}),
    ...(Array.isArray(ov.menuPrices) ? { menuPrices: ov.menuPrices } : {}),
    ...(Array.isArray(ov.photos) ? { photos: ov.photos } : {}),
    ...(ov.menuName !== undefined ? { menuName: ov.menuName } : {}),
    ...(ov.menuPriceLabel !== undefined ? { menuPriceLabel: ov.menuPriceLabel } : {}),
  };
}

export function detailPathForRestaurant(name) {
  return `/detail?r=${encodeURIComponent(name)}`;
}
