import { apiFetch, isApiConfigured } from './api.js';

/** @type {object[]} */
let serverRestaurantsCache = [];

export function getServerRestaurantsCache() {
  return serverRestaurantsCache;
}

export function setServerRestaurantsCache(list) {
  serverRestaurantsCache = Array.isArray(list) ? list : [];
}

/** Spring RestaurantPublicDto → 승인 식당과 동일 형태 */
function mapDtoToRow(d) {
  return {
    id: d.id,
    approvedId: d.approvedId ?? `db-${d.id}`,
    name: d.name,
    category: d.category,
    rating: String(d.rating ?? '0'),
    address: d.address ?? '',
    recommendCount: d.recommendCount ?? 0,
    reviewCount: d.reviewCount ?? 0,
    menuPrices: Array.isArray(d.menuPrices) ? d.menuPrices : [],
    photos: Array.isArray(d.photos) ? d.photos : [],
    phone: d.phone ?? '',
    menuName: d.menuName ?? '',
    menuPriceLabel: d.menuPriceLabel ?? '',
  };
}

/**
 * GET /api/restaurants 캐시 갱신
 * @returns {Promise<object[]>}
 */
export async function fetchRestaurantsFromApi() {
  if (!isApiConfigured()) {
    setServerRestaurantsCache([]);
    return [];
  }
  const res = await apiFetch('/api/restaurants');
  if (!res.ok) {
    setServerRestaurantsCache([]);
    return [];
  }
  const data = await res.json();
  const rows = Array.isArray(data) ? data.map(mapDtoToRow) : [];
  setServerRestaurantsCache(rows);
  return rows;
}
