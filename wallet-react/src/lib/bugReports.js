import { notifyAdminInboxChanged } from './adminInboxEvents';
import { apiFetch, isApiConfigured } from './api.js';
import { adminHeaders, isApiSession, loginHeaders } from './auth.js';

const KEY = 'wallet_bug_reports';
let apiBugCache = null;

export function loadBugReports() {
  if (isApiConfigured()) return apiBugCache ?? [];
  try {
    const raw = localStorage.getItem(KEY);
    const prev = raw ? JSON.parse(raw) : [];
    return Array.isArray(prev) ? prev : [];
  } catch {
    return [];
  }
}

function save(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 150)));
    notifyAdminInboxChanged();
  } catch {
    /* ignore */
  }
}

export function addBugReport(payload) {
  if (isApiConfigured() && isApiSession()) {
    return (async () => {
      const res = await apiFetch('/api/bug-reports', {
        method: 'POST',
        headers: { ...loginHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.text()) || '버그 제보 저장 실패');
      return res.json();
    })();
  }
  const row = {
    ...payload,
    id: `bug-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    status: 'open',
    createdAt: new Date().toISOString(),
  };
  save([row, ...loadBugReports()]);
  return Promise.resolve(row);
}

export function setBugReportStatus(id, status) {
  if (isApiConfigured() && isApiSession()) {
    return (async () => {
      await apiFetch(`/api/bug-reports/admin/${id}`, {
        method: 'PATCH',
        headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    })();
  }
  save(loadBugReports().map((r) => (r.id === id ? { ...r, status, updatedAt: new Date().toISOString() } : r)));
  return Promise.resolve();
}

export function removeBugReport(id) {
  if (isApiConfigured() && isApiSession()) {
    return (async () => {
      await apiFetch(`/api/bug-reports/admin/${id}`, {
        method: 'DELETE',
        headers: adminHeaders(),
      });
    })();
  }
  save(loadBugReports().filter((r) => r.id !== id));
  return Promise.resolve();
}

export async function fetchBugReportsFromApi() {
  if (!isApiConfigured()) {
    apiBugCache = null;
    return;
  }
  const res = await apiFetch('/api/bug-reports/admin', { headers: adminHeaders() });
  if (!res.ok) {
    apiBugCache = [];
    notifyAdminInboxChanged();
    return;
  }
  apiBugCache = await res.json();
  notifyAdminInboxChanged();
}
