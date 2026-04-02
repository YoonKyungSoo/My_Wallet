import { REGISTER_MAX_PHOTOS } from './mediaLimits';
import { getMapCommentsForRestaurant } from './mapComments';
import { apiFetch, isApiConfigured } from './api.js';
import { adminHeaders } from './auth.js';

const HIDDEN_KEY = 'wallet_restaurant_hidden_photo_urls';
let hiddenPhotoCacheByRestaurant = {};

/** 승인 식당 이름 변경 시 숨김 사진 키 이전 */
export function renameHiddenPhotoRestaurantKey(oldName, newName) {
  const o = oldName?.trim();
  const n = newName?.trim();
  if (!o || !n || o === n) return;
  try {
    const raw = localStorage.getItem(HIDDEN_KEY);
    let obj = {};
    if (raw) {
      const p = JSON.parse(raw);
      if (p && typeof p === 'object' && !Array.isArray(p)) obj = p;
    }
    if (!obj[o]) return;
    const urls = Array.isArray(obj[o]) ? obj[o] : [];
    delete obj[o];
    if (Array.isArray(obj[n])) {
      obj[n] = [...new Set([...obj[n], ...urls])];
    } else {
      obj[n] = urls;
    }
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(obj));
    window.dispatchEvent(new Event('wallet-hidden-photos-changed'));
  } catch {
    /* ignore */
  }
}

/** 식당 삭제 시 숨김 URL 목록에서 해당 키 제거 */
export function clearHiddenPhotosForRestaurant(restaurantName) {
  const key = restaurantName?.trim();
  if (!key) return;
  try {
    const raw = localStorage.getItem(HIDDEN_KEY);
    if (!raw) return;
    const o = JSON.parse(raw);
    if (!o || typeof o !== 'object' || Array.isArray(o)) return;
    if (!o[key]) return;
    delete o[key];
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(o));
    window.dispatchEvent(new Event('wallet-hidden-photos-changed'));
  } catch {
    /* ignore */
  }
}

/** 관리자가 시드 식당 등 코드 상 사진을 UI에서만 숨길 때 사용 */
export function hideRestaurantDisplayPhoto(restaurantName, url) {
  if (isApiConfigured()) {
    void apiFetch('/api/restaurant-hidden-photos', {
      method: 'POST',
      headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurantName, photoUrl: url }),
    }).then(() => {
      hiddenPhotoCacheByRestaurant[restaurantName] = [...(hiddenPhotoCacheByRestaurant[restaurantName] || []), url];
      window.dispatchEvent(new Event('wallet-hidden-photos-changed'));
    });
    return;
  }
  const key = restaurantName?.trim();
  if (!key || !url) return;
  try {
    const raw = localStorage.getItem(HIDDEN_KEY);
    let o = {};
    if (raw) {
      const p = JSON.parse(raw);
      if (p && typeof p === 'object' && !Array.isArray(p)) o = p;
    }
    const list = Array.isArray(o[key]) ? o[key] : [];
    if (!list.includes(url)) list.push(url);
    o[key] = list;
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(o));
    window.dispatchEvent(new Event('wallet-hidden-photos-changed'));
  } catch {
    /* ignore */
  }
}

function hiddenPhotoSetForRestaurant(name) {
  if (isApiConfigured()) {
    return new Set(hiddenPhotoCacheByRestaurant[name?.trim()] || []);
  }
  try {
    const raw = localStorage.getItem(HIDDEN_KEY);
    const o = raw ? JSON.parse(raw) : {};
    const list = Array.isArray(o[name?.trim()]) ? o[name.trim()] : [];
    return new Set(list);
  } catch {
    return new Set();
  }
}

export async function fetchHiddenPhotosForRestaurant(name) {
  if (!isApiConfigured() || !name?.trim()) return;
  const res = await apiFetch(`/api/restaurant-hidden-photos?restaurantName=${encodeURIComponent(name.trim())}`);
  if (!res.ok) return;
  const rows = await res.json();
  hiddenPhotoCacheByRestaurant[name.trim()] = Array.isArray(rows) ? rows : [];
  window.dispatchEvent(new Event('wallet-hidden-photos-changed'));
}

function collectCommentPhotoUrls(commentList) {
  const out = [];
  for (const c of commentList) {
    if (!Array.isArray(c.photos)) continue;
    for (const u of c.photos) {
      if (typeof u === 'string' && u) out.push(u);
    }
  }
  return out;
}

/**
 * 식당 등록 사진(최대 REGISTER_MAX_PHOTOS) + 해당 식당 리뷰 첨부 사진을 순서대로 합칩니다(중복 URL 제거).
 * @param {{ name: string, photos?: string[] }} restaurant
 * @param {unknown[]} [commentListOverride] React state 등으로 넘기면 스토리지 대신 이 목록에서 첨부 사진을 뽑습니다.
 */
export function mergeRestaurantGalleryPhotos(restaurant, commentListOverride) {
  const name = restaurant?.name;
  if (!name) return [];
  const seen = new Set();
  const out = [];
  const reg = Array.isArray(restaurant.photos)
    ? restaurant.photos.filter((u) => typeof u === 'string' && u).slice(0, REGISTER_MAX_PHOTOS)
    : [];
  for (const u of reg) {
    if (!seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  const comments = Array.isArray(commentListOverride)
    ? commentListOverride
    : getMapCommentsForRestaurant(name);
  for (const u of collectCommentPhotoUrls(comments)) {
    if (!seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  const hide = hiddenPhotoSetForRestaurant(name);
  return out.filter((u) => !hide.has(u));
}
