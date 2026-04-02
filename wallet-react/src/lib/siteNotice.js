import { apiFetch, isApiConfigured } from './api.js';
import { adminHeaders } from './auth.js';

const KEY = 'wallet_site_notice';

export const SITE_NOTICE_CHANGED = 'wallet-site-notice-changed';

/** @type {{ text: string, active: boolean, updatedAt: string | null } | null} */
let apiNoticeCache = null;

function dispatch() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SITE_NOTICE_CHANGED));
  }
}

export async function fetchSiteNoticeFromApi() {
  if (!isApiConfigured()) {
    apiNoticeCache = null;
    return;
  }
  try {
    const res = await apiFetch('/api/site-notice');
    if (!res.ok) return;
    const j = await res.json();
    apiNoticeCache = {
      text: typeof j.body === 'string' ? j.body : '',
      active: Boolean(j.active),
      updatedAt: j.updatedAt || null,
    };
    dispatch();
  } catch {
    /* ignore */
  }
}

export function getSiteNotice() {
  if (isApiConfigured()) {
    if (apiNoticeCache) {
      return {
        text: apiNoticeCache.text,
        active: apiNoticeCache.active,
        updatedAt: apiNoticeCache.updatedAt,
      };
    }
    return { text: '', active: false, updatedAt: null };
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { text: '', active: false, updatedAt: null };
    const p = JSON.parse(raw);
    const text = typeof p.text === 'string' ? p.text : '';
    return {
      text,
      active: Boolean(p.active),
      updatedAt: p.updatedAt || null,
    };
  } catch {
    return { text: '', active: false, updatedAt: null };
  }
}

/** 메인 등에 표시할 문구 (비어 있으면 숨김) */
export function getActiveNoticeText() {
  const { text, active } = getSiteNotice();
  if (!active || !text.trim()) return '';
  return text.trim();
}

/** 관리자: 공지 게시 */
export async function publishSiteNotice(text) {
  const t = (text || '').trim();
  if (isApiConfigured()) {
    const res = await apiFetch('/api/site-notice', {
      method: 'PUT',
      headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: t, active: Boolean(t) }),
    });
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg || '공지 저장에 실패했습니다.');
    }
    await fetchSiteNoticeFromApi();
    return;
  }
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        text: t,
        active: Boolean(t),
        updatedAt: new Date().toISOString(),
      }),
    );
    dispatch();
  } catch {
    /* ignore */
  }
}

/** 관리자: 공지 내리기 */
export async function clearSiteNotice() {
  if (isApiConfigured()) {
    const res = await apiFetch('/api/site-notice', {
      method: 'PUT',
      headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: '', active: false }),
    });
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg || '공지 내리기에 실패했습니다.');
    }
    await fetchSiteNoticeFromApi();
    return;
  }
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ text: '', active: false, updatedAt: new Date().toISOString() }),
    );
    dispatch();
  } catch {
    /* ignore */
  }
}
