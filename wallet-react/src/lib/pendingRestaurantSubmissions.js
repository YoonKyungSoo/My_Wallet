import { notifyAdminInboxChanged } from './adminInboxEvents';
import { apiFetch, isApiConfigured } from './api.js';
import { adminHeaders, loginHeaders } from './auth.js';

const KEY = 'wallet_pending_restaurant_submissions';

/** @type {object[] | null} */
let apiSubmissionCache = null;

export function listPendingSubmissions() {
  return listAllSubmissionsForAdmin().filter((x) => x.status === 'pending');
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

function writeAll(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    notifyAdminInboxChanged();
  } catch {
    /* ignore */
  }
}

function mapApiSubmission(s) {
  const cat = s.categoryLabel ?? s.category ?? '';
  return {
    id: s.id,
    status: s.status,
    createdAt: s.createdAt,
    restaurantName: s.restaurantName,
    restaurantAddress: s.restaurantAddress,
    category: cat,
    categoryLabel: cat,
    menuName: s.menuName,
    menuPrice: s.menuPrice,
    rating: s.rating,
    photos: Array.isArray(s.photos) ? s.photos : [],
    decidedAt: s.decidedAt,
  };
}

/** 관리자 목록 갱신 (GET /api/admin/restaurant-submissions) */
export async function fetchSubmissionsFromApi() {
  if (!isApiConfigured()) {
    apiSubmissionCache = null;
    return;
  }
  try {
    const res = await apiFetch('/api/admin/restaurant-submissions', { headers: adminHeaders() });
    if (!res.ok) {
      apiSubmissionCache = [];
      notifyAdminInboxChanged();
      return;
    }
    const rows = await res.json();
    apiSubmissionCache = Array.isArray(rows) ? rows.map(mapApiSubmission) : [];
    notifyAdminInboxChanged();
  } catch {
    apiSubmissionCache = [];
    notifyAdminInboxChanged();
  }
}

async function addPendingSubmissionApi(payload) {
  const res = await apiFetch('/api/restaurant-submissions', {
    method: 'POST',
    headers: { ...loginHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurantName: payload.restaurantName,
      restaurantAddress: payload.restaurantAddress,
      categoryLabel:
        typeof payload.category === 'string'
          ? payload.category
          : categoryLabelToPlain(payload.category),
      menuName: payload.menuName,
      menuPrice: payload.menuPrice ?? '',
      rating: payload.rating,
      photos: payload.photos || [],
    }),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || '제보 접수에 실패했습니다.');
  }
  const row = await res.json();
  return mapApiSubmission(row);
}

/** @returns {Promise<object>} */
export function addPendingSubmission(payload) {
  if (isApiConfigured()) {
    return addPendingSubmissionApi(payload);
  }
  const row = {
    id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    status: 'pending',
    createdAt: new Date().toISOString(),
    category: payload.category,
    ...payload,
  };
  writeAll([row, ...readAll()].slice(0, 200));
  return Promise.resolve(row);
}

export function listAllSubmissionsForAdmin() {
  if (isApiConfigured()) {
    return apiSubmissionCache ?? [];
  }
  return readAll();
}

export function setSubmissionStatus(id, status) {
  if (isApiConfigured()) return;
  const list = readAll().map((r) =>
    r.id === id ? { ...r, status, decidedAt: new Date().toISOString() } : r,
  );
  writeAll(list);
}

export async function approveSubmissionOnServer(id) {
  const res = await apiFetch(`/api/admin/restaurant-submissions/${id}/approve`, {
    method: 'POST',
    headers: adminHeaders(),
  });
  return res.ok;
}

export async function rejectSubmissionOnServer(id) {
  const res = await apiFetch(`/api/admin/restaurant-submissions/${id}/reject`, {
    method: 'POST',
    headers: adminHeaders(),
  });
  return res.ok;
}

export function removeSubmission(id) {
  if (isApiConfigured()) return;
  writeAll(readAll().filter((r) => r.id !== id));
}

/** '8,000원' / '7,000~9,000원' 등 → 숫자 배열 */
export function menuPriceTextToMenuPrices(text) {
  if (!text || typeof text !== 'string') return [5000];
  const matches = text.match(/\d[\d,]*/g);
  if (!matches?.length) return [5000];
  const nums = matches
    .map((m) => parseInt(m.replace(/,/g, ''), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
  return nums.length ? nums : [5000];
}

/** '🍚 한식' → '한식' */
export function categoryLabelToPlain(category) {
  if (!category || typeof category !== 'string') return '기타';
  const parts = category.trim().split(/\s+/);
  if (parts.length >= 2) return parts[parts.length - 1];
  return category.replace(/[^\uAC00-\uD7A3a-zA-Z0-9/]/g, '').trim() || '기타';
}
