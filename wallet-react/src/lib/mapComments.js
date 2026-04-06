import { apiFetch, isApiConfigured } from './api.js';
import { Auth, adminHeaders, isApiSession, loginHeaders } from './auth.js';

const KEY = 'wallet_map_comments';

/** @typedef {{ id?: string, nickname: string, levelTitle?: string, rating?: number, text?: string, photos?: string[] }} MapComment */

export const MAP_COMMENTS_CHANGED = 'wallet-map-comments-changed';

const API_CACHE_TTL_MS = 10 * 60 * 1000; // 10분
/** @type {Map<string, { at: number, list: MapComment[] }>} */
let apiCacheByRestaurant = new Map();

function notifyChanged() {
  // 댓글이 추가/삭제되면 캐시를 버려서 즉시 반영되게 함
  apiCacheByRestaurant = new Map();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(MAP_COMMENTS_CHANGED));
  }
}

/**
 * 식당 삭제/숨김 등으로 해당 식당 댓글을 즉시 무효화.
 * - API 모드: 캐시에서 제거
 * - 로컬 모드: 스토리지에서 삭제
 */
export function invalidateMapCommentsForRestaurant(restaurantName) {
  const key = restaurantName?.trim();
  if (!key) return;
  if (isApiConfigured()) {
    apiCacheByRestaurant.delete(key);
    notifyChanged();
    return;
  }
  clearMapCommentsForRestaurant(key);
  notifyChanged();
}

function readRaw() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    return typeof v === 'object' && v !== null ? v : null;
  } catch {
    return null;
  }
}

/** @returns {Record<string, MapComment[]>} */
export function loadAllMapComments() {
  let all = readRaw();
  if (!all) {
    all = {};
    try {
      localStorage.setItem(KEY, JSON.stringify(all));
    } catch {
      /* ignore */
    }
    return all;
  }
  return all;
}

export function saveAllMapComments(store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
  notifyChanged();
}

/** @param {string} name */
export function getMapCommentsForRestaurant(name) {
  if (isApiConfigured()) {
    return [];
  }
  const all = loadAllMapComments();
  const list = all[name];
  return Array.isArray(list) ? list : [];
}

/**
 * API 모드: 서버에서 맵 댓글 로드
 * @param {string} name
 * @returns {Promise<MapComment[]>}
 */
export async function fetchMapCommentsForRestaurant(name) {
  if (!isApiConfigured()) {
    return getMapCommentsForRestaurant(name);
  }
  const n = name?.trim();
  if (!n) return [];
  const cached = apiCacheByRestaurant.get(n);
  if (cached && Date.now() - cached.at < API_CACHE_TTL_MS) {
    return Array.isArray(cached.list) ? cached.list : [];
  }
  const res = await apiFetch(`/api/map-comments?restaurantName=${encodeURIComponent(n)}`);
  if (!res.ok) return [];
  const list = await res.json();
  const safe = Array.isArray(list) ? list : [];
  apiCacheByRestaurant.set(n, { at: Date.now(), list: safe });
  return safe;
}

/**
 * @param {string} name
 * @param {MapComment[]} comments
 */
export function setMapCommentsForRestaurant(name, comments) {
  if (isApiConfigured()) return;
  const all = loadAllMapComments();
  all[name] = comments;
  saveAllMapComments(all);
}

/** @returns {Promise<void>}
 */
export function deleteMapCommentById(restaurantName, commentId) {
  if (isApiConfigured()) {
    if (isApiSession()) return deleteMapCommentByIdRemote(commentId);
    return Promise.resolve();
  }
  if (!restaurantName || !commentId) return Promise.resolve();
  const list = getMapCommentsForRestaurant(restaurantName).filter((c) => c.id !== commentId);
  setMapCommentsForRestaurant(restaurantName, list);
  return Promise.resolve();
}

async function deleteMapCommentByIdRemote(commentId) {
  const id = String(commentId);
  if (!id) return;
  const headers = Auth.isAdmin() ? adminHeaders() : loginHeaders();
  const res = await apiFetch(`/api/map-comments/${encodeURIComponent(id)}`, { method: 'DELETE', headers });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || '삭제에 실패했습니다.');
  }
  notifyChanged();
}

/** @param {number} index 0-based */
export function deleteMapCommentByIndex(restaurantName, index) {
  if (isApiConfigured()) return;
  if (!restaurantName || typeof index !== 'number' || index < 0) return;
  const list = getMapCommentsForRestaurant(restaurantName);
  if (index >= list.length) return;
  const next = list.filter((_, i) => i !== index);
  setMapCommentsForRestaurant(restaurantName, next);
}

/** 식당 삭제 시 해당 식당의 방문자 리뷰(맵 댓글) 전부 제거 */
export function clearMapCommentsForRestaurant(restaurantName) {
  if (isApiConfigured()) return;
  const key = restaurantName?.trim();
  if (!key) return;
  const all = loadAllMapComments();
  if (!all[key]) return;
  delete all[key];
  saveAllMapComments(all);
}

export function renameRestaurantCommentsKey(oldName, newName) {
  if (isApiConfigured()) return;
  const o = oldName?.trim();
  const n = newName?.trim();
  if (!o || !n || o === n) return;
  const all = loadAllMapComments();
  const cur = all[o];
  if (!cur) return;
  if (all[n]) {
    all[n] = [...(Array.isArray(all[n]) ? all[n] : []), ...(Array.isArray(cur) ? cur : [])];
  } else {
    all[n] = cur;
  }
  delete all[o];
  saveAllMapComments(all);
}

export function removePhotoFromMapComment(restaurantName, commentId, photoUrl) {
  if (isApiConfigured()) {
    return (async () => {
      const id = String(commentId || '').trim();
      const url = String(photoUrl || '').trim();
      if (!id || !url) return;
      const headers = {
        ...(Auth.isAdmin() ? adminHeaders() : loginHeaders()),
        'Content-Type': 'application/json',
      };
      const res = await apiFetch(`/api/map-comments/${encodeURIComponent(id)}/photos/delete`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ photoUrl: url }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || '사진 삭제에 실패했습니다.');
      }
      notifyChanged();
    })();
  }
  if (!restaurantName || !commentId || !photoUrl) return;
  const list = getMapCommentsForRestaurant(restaurantName).map((c) => {
    if (c.id !== commentId) return c;
    const photos = (c.photos || []).filter((u) => u !== photoUrl);
    const next = { ...c };
    if (photos.length) next.photos = photos;
    else delete next.photos;
    return next;
  });
  setMapCommentsForRestaurant(restaurantName, list);
  return Promise.resolve();
}
