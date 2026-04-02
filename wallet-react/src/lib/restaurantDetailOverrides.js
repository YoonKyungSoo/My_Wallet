/** 시드(코드) 식당만 — 상세 화면에서 관리자가 수정한 값을 로컬에 덮어씁니다. */

const KEY = 'wallet_restaurant_detail_overrides';

export const DETAIL_OVERRIDES_CHANGED = 'wallet-restaurant-detail-overrides-changed';

function dispatch() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(DETAIL_OVERRIDES_CHANGED));
  }
}

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    const o = raw ? JSON.parse(raw) : {};
    return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
  } catch {
    return {};
  }
}

function writeAll(obj) {
  try {
    localStorage.setItem(KEY, JSON.stringify(obj));
    dispatch();
  } catch {
    /* ignore */
  }
}

/** @param {string} name */
export function getRestaurantDetailOverride(name) {
  const n = name?.trim();
  if (!n) return null;
  const row = readAll()[n];
  return row && typeof row === 'object' ? row : null;
}

/**
 * @param {string} name 기존 식당명(시드 키)
 * @param {{ address?: string, category?: string, rating?: string, phone?: string, menuPrices?: number[], photos?: string[] }} patch
 */
export function setRestaurantDetailOverride(name, patch) {
  const n = name?.trim();
  if (!n) return;
  const all = readAll();
  const prev = all[n] && typeof all[n] === 'object' ? all[n] : {};
  all[n] = { ...prev, ...patch };
  writeAll(all);
}

export function clearRestaurantDetailOverride(name) {
  const n = name?.trim();
  if (!n) return;
  const all = readAll();
  if (!all[n]) return;
  delete all[n];
  writeAll(all);
}
