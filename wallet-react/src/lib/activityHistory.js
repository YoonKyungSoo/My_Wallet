import { Auth } from './auth';
import { apiFetch, isApiConfigured } from './api.js';
import { loginHeaders } from './auth.js';

/** @deprecated 전역 저장(구버전). 신규 기록은 계정별 키만 사용 */
export const ACTIVITY_HISTORY_KEY = 'wallet_activity_history';

export const ACTIVITY_HISTORY_CHANGED = 'wallet-activity-history-changed';
let apiActivityCache = null;

function notifyChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ACTIVITY_HISTORY_CHANGED));
  }
}

function storageKeyForUser(userId) {
  return `wallet_activity_u:${userId}`;
}

function readLegacyAll() {
  try {
    const raw = localStorage.getItem(ACTIVITY_HISTORY_KEY);
    const prev = raw ? JSON.parse(raw) : [];
    return Array.isArray(prev) ? prev : [];
  } catch {
    return [];
  }
}

/**
 * 해당 회원의 활동 이력(최신순). 계정별 키만 사용.
 * 구버전 전역 키는 `userId`가 일치하는 행만 이전 (닉네임만으로 매칭하지 않음 — 신규 가입자에게 타인 기록이 섞이는 문제 방지).
 * @param {string} userId
 */
export function loadActivityHistoryForUser(userId) {
  if (isApiConfigured()) {
    return apiActivityCache ?? [];
  }
  if (!userId) return [];
  try {
    const key = storageKeyForUser(userId);
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      const mine = JSON.parse(raw);
      if (!Array.isArray(mine)) return [];
      return mine.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    }
    const legacy = readLegacyAll();
    const migrated = legacy.filter((r) => r.userId === userId);
    const sorted = migrated.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    try {
      localStorage.setItem(key, JSON.stringify(sorted));
    } catch {
      /* ignore */
    }
    return sorted;
  } catch {
    return [];
  }
}

export function pushActivityHistory(item) {
  if (isApiConfigured()) {
    return (async () => {
      await apiFetch('/api/activity-events', {
        method: 'POST',
        headers: { ...loginHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: item.type || 'other', payload: item }),
      });
      notifyChanged();
    })();
  }
  const session = Auth.getSession();
  if (!session?.id) return;
  try {
    const key = storageKeyForUser(session.id);
    const raw = localStorage.getItem(key);
    const prev = raw ? JSON.parse(raw) : [];
    const safePrev = Array.isArray(prev) ? prev : [];
    const row = {
      ...item,
      userId: session.id,
      id: item.id || `h-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    const next = [row, ...safePrev].slice(0, 100);
    localStorage.setItem(key, JSON.stringify(next));
    notifyChanged();
  } catch {
    /* ignore */
  }
}

export async function fetchActivityHistoryFromApi() {
  if (!isApiConfigured()) {
    apiActivityCache = null;
    return;
  }
  const res = await apiFetch('/api/activity-events', { headers: loginHeaders() });
  if (!res.ok) {
    apiActivityCache = [];
    return;
  }
  const rows = await res.json();
  apiActivityCache = Array.isArray(rows)
    ? rows.map((r) => ({ id: r.id, type: r.type, createdAt: r.createdAt, ...(r.payload || {}) }))
    : [];
  notifyChanged();
}
