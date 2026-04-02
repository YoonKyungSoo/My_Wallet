import { apiFetch, isApiConfigured } from './api.js';
import { Auth, adminHeaders, isApiSession, loginHeaders } from './auth.js';

const KEY = 'wallet_map_comments';

/** @typedef {{ id?: string, nickname: string, levelTitle?: string, rating?: number, text?: string, photos?: string[] }} MapComment */

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
  const res = await apiFetch(`/api/map-comments?restaurantName=${encodeURIComponent(n)}`);
  if (!res.ok) return [];
  const list = await res.json();
  return Array.isArray(list) ? list : [];
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
  if (isApiConfigured()) return;
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
}
