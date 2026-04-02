import { notifyAdminInboxChanged } from './adminInboxEvents';
import { apiFetch, isApiConfigured } from './api.js';
import { adminHeaders, loginHeaders } from './auth.js';

const KEY = 'wallet_unban_requests';
let apiUnbanCache = null;

export const UNBAN_REQUESTS_CHANGED = 'wallet-unban-requests-changed';

function dispatch() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(UNBAN_REQUESTS_CHANGED));
    notifyAdminInboxChanged();
  }
}

function readAll() {
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
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 200)));
    dispatch();
  } catch {
    /* ignore */
  }
}

export function loadUnbanRequests() {
  if (isApiConfigured()) return apiUnbanCache ?? [];
  return readAll();
}

export function listPendingUnbanRequests() {
  if (isApiConfigured()) return (apiUnbanCache ?? []).filter((r) => r.status === 'pending');
  return readAll().filter((r) => r.status === 'pending');
}

/**
 * @param {string} userId
 */
export function pushUnbanRequest(userId) {
  if (isApiConfigured()) {
    return (async () => {
      const id = userId?.trim();
      const hasSession = Object.keys(loginHeaders()).length > 0;
      const res = hasSession
        ? await apiFetch('/api/unban-requests', {
            method: 'POST',
            headers: loginHeaders(),
          })
        : await apiFetch('/api/unban-requests/public', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ loginId: id }),
          });
      if (!res.ok) {
        return { ok: false, reason: (await res.text()) || '요청 접수 실패' };
      }
      return { ok: true };
    })();
  }
  const id = userId?.trim();
  if (!id) return { ok: false, reason: '아이디를 확인할 수 없습니다.' };
  const list = readAll();
  const exists = list.some((r) => r.userId === id && r.status === 'pending');
  if (exists) return { ok: false, reason: '이미 정지 해제 요청이 접수되어 있습니다.' };
  const row = {
    id: `ubr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId: id,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  save([row, ...list]);
  return { ok: true };
}

export function setUnbanRequestStatus(requestId, status) {
  if (isApiConfigured()) {
    return (async () => {
      await apiFetch(`/api/unban-requests/admin/${requestId}`, {
        method: 'PATCH',
        headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    })();
  }
  const list = readAll().map((r) =>
    r.id === requestId
      ? { ...r, status, updatedAt: new Date().toISOString() }
      : r,
  );
  save(list);
  return Promise.resolve();
}

export async function fetchUnbanRequestsFromApi() {
  if (!isApiConfigured()) {
    apiUnbanCache = null;
    return;
  }
  const res = await apiFetch('/api/unban-requests/admin', { headers: adminHeaders() });
  if (!res.ok) {
    apiUnbanCache = [];
    dispatch();
    return;
  }
  apiUnbanCache = await res.json();
  dispatch();
}
