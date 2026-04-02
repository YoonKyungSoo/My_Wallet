import { apiFetch, isApiConfigured } from './api.js';
import { isApiSession, loginHeaders } from './auth.js';

export const BOOKMARKS_CHANGED = 'wallet-bookmarks-changed';

const KEY = 'wallet_bookmarked_restaurants';

function notifyBookmarksChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(BOOKMARKS_CHANGED));
  }
}

/** API 모드에서 북마크 이름 집합 (null = 아직 로드 전) */
let apiBookmarkSet = null;
let apiBookmarksLoaded = false;

function readList() {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string' && x) : [];
  } catch {
    return [];
  }
}

function writeList(names) {
  try {
    localStorage.setItem(KEY, JSON.stringify(names));
  } catch {
    /* ignore */
  }
}

function shouldUseRemoteBookmarks() {
  return isApiConfigured() && isApiSession();
}

/** 서버 북마크 목록 로드 (로그인 세션 없으면 빈 집합) */
export async function loadBookmarksFromApi() {
  if (!shouldUseRemoteBookmarks()) {
    apiBookmarkSet = null;
    apiBookmarksLoaded = false;
    return;
  }
  try {
    const res = await apiFetch('/api/bookmarks', { headers: loginHeaders() });
    if (!res.ok) {
      apiBookmarkSet = new Set();
      apiBookmarksLoaded = true;
      notifyBookmarksChanged();
      return;
    }
    const names = await res.json();
    apiBookmarkSet = new Set(Array.isArray(names) ? names : []);
    apiBookmarksLoaded = true;
  } catch {
    apiBookmarkSet = new Set();
    apiBookmarksLoaded = true;
  }
  notifyBookmarksChanged();
}

export function getBookmarkedRestaurantNames() {
  if (shouldUseRemoteBookmarks()) {
    if (!apiBookmarksLoaded || !apiBookmarkSet) return [];
    return [...apiBookmarkSet];
  }
  return readList();
}

export function isRestaurantBookmarked(name) {
  if (!name) return false;
  if (shouldUseRemoteBookmarks()) {
    if (!apiBookmarksLoaded || !apiBookmarkSet) return false;
    return apiBookmarkSet.has(name);
  }
  return readList().includes(name);
}

/** @returns {Promise<boolean>} 북마크된 상태로 바뀐 뒤 값 */
export async function toggleRestaurantBookmark(name) {
  if (!name) return false;
  if (shouldUseRemoteBookmarks()) {
    const res = await apiFetch(`/api/bookmarks/toggle?name=${encodeURIComponent(name)}`, {
      method: 'POST',
      headers: loginHeaders(),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || '북마크 처리에 실패했습니다.');
    }
    const added = await res.json();
    if (!apiBookmarkSet) apiBookmarkSet = new Set();
    if (added) apiBookmarkSet.add(name);
    else apiBookmarkSet.delete(name);
    apiBookmarksLoaded = true;
    notifyBookmarksChanged();
    return Boolean(added);
  }
  const list = readList();
  const i = list.indexOf(name);
  if (i >= 0) {
    list.splice(i, 1);
    writeList(list);
    notifyBookmarksChanged();
    return false;
  }
  writeList([name, ...list]);
  notifyBookmarksChanged();
  return true;
}

export function removeBookmarkByRestaurantName(name) {
  const n = name?.trim();
  if (!n) return;
  if (shouldUseRemoteBookmarks()) {
    if (apiBookmarkSet?.has(n)) {
      void toggleRestaurantBookmark(n).catch(() => {});
    }
    return;
  }
  const list = readList().filter((x) => x !== n);
  writeList(list);
  notifyBookmarksChanged();
}

export function renameRestaurantInBookmarks(oldName, newName) {
  const o = oldName?.trim();
  const n = newName?.trim();
  if (!o || !n || o === n) return;
  if (shouldUseRemoteBookmarks()) {
    if (apiBookmarkSet?.has(o)) {
      apiBookmarkSet.delete(o);
      apiBookmarkSet.add(n);
    }
    return;
  }
  const list = readList();
  if (!list.includes(o)) return;
  const next = [...new Set(list.map((x) => (x === o ? n : x)))];
  writeList(next);
  notifyBookmarksChanged();
}
