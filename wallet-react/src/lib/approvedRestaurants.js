import { removeBookmarkByRestaurantName, renameRestaurantInBookmarks } from './bookmarks';
import { clearMapCommentsForRestaurant, renameRestaurantCommentsKey } from './mapComments';
import { clearRestaurantDetailOverride } from './restaurantDetailOverrides';

const KEY = 'wallet_approved_restaurants';

export const RESTAURANTS_CHANGED = 'wallet-restaurants-changed';

function notifyChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(RESTAURANTS_CHANGED));
  }
}

export function loadApprovedRestaurants() {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function save(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    notifyChanged();
  } catch {
    /* ignore */
  }
}

/** 시드 항목과 동일 필드 + approvedId */
export function addApprovedRestaurant(record) {
  const list = loadApprovedRestaurants();
  const approvedId = record.approvedId || `appr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  list.push({ ...record, approvedId });
  save(list);
  return approvedId;
}

export function removeApprovedRestaurant(approvedId) {
  const list = loadApprovedRestaurants();
  const row = list.find((r) => r.approvedId === approvedId);
  const name = row?.name?.trim();
  const next = list.filter((r) => r.approvedId !== approvedId);
  save(next);
  if (name) {
    clearMapCommentsForRestaurant(name);
    removeBookmarkByRestaurantName(name);
    clearRestaurantDetailOverride(name);
  }
}

export function updateApprovedRestaurantPhotos(approvedId, photos) {
  const list = loadApprovedRestaurants().map((r) =>
    r.approvedId === approvedId ? { ...r, photos: Array.isArray(photos) ? photos : [] } : r,
  );
  save(list);
}

/**
 * 승인 식당 전체 필드 수정. 이름이 바뀌면 댓글·북마크·숨김 사진 키를 같이 이전합니다.
 * @param {string} approvedId
 * @param {{ name?: string, address?: string, category?: string, rating?: string | number, menuPrices?: number[], photos?: string[], phone?: string, recommendCount?: number, reviewCount?: number }} patch
 */
export function updateApprovedRestaurantFull(approvedId, patch) {
  const list = loadApprovedRestaurants();
  const idx = list.findIndex((r) => r.approvedId === approvedId);
  if (idx < 0) return { ok: false, reason: '항목을 찾을 수 없습니다.' };
  const prev = list[idx];
  const nextName = patch.name != null ? String(patch.name).trim() : prev.name;
  if (!nextName) return { ok: false, reason: '식당 이름이 필요합니다.' };
  if (nextName !== prev.name) {
    const exists = [...list.filter((_, i) => i !== idx)].some((r) => r.name === nextName);
    if (exists) return { ok: false, reason: '이미 같은 이름의 승인 식당이 있습니다.' };
    renameRestaurantCommentsKey(prev.name, nextName);
    renameRestaurantInBookmarks(prev.name, nextName);
  }
  const nextRow = {
    ...prev,
    name: nextName,
    address: patch.address !== undefined ? patch.address : prev.address,
    category: patch.category !== undefined ? patch.category : prev.category,
    rating: patch.rating !== undefined ? String(patch.rating) : prev.rating,
    menuPrices: patch.menuPrices !== undefined ? patch.menuPrices : prev.menuPrices,
    photos: patch.photos !== undefined ? patch.photos : prev.photos,
    phone: patch.phone !== undefined ? patch.phone : prev.phone,
    recommendCount: patch.recommendCount !== undefined ? patch.recommendCount : prev.recommendCount,
    reviewCount: patch.reviewCount !== undefined ? patch.reviewCount : prev.reviewCount,
    menuName: patch.menuName !== undefined ? patch.menuName : prev.menuName,
    menuPriceLabel: patch.menuPriceLabel !== undefined ? patch.menuPriceLabel : prev.menuPriceLabel,
    approvedId: prev.approvedId,
  };
  const nextList = [...list];
  nextList[idx] = nextRow;
  save(nextList);
  return { ok: true };
}
