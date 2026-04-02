import { notifyAdminInboxChanged } from './adminInboxEvents';
import { apiFetch, isApiConfigured } from './api.js';
import { adminHeaders, isApiSession, loginHeaders } from './auth.js';

function hasLoginHeader() {
  return Object.keys(loginHeaders()).length > 0;
}

/** 관리자에서 조회·처리하는 댓글 신고 목록 */
export const COMMENT_REPORTS_KEY = 'wallet_comment_reports';
let apiCommentReportCache = null;

export function loadCommentReports() {
  if (isApiConfigured()) return apiCommentReportCache ?? [];
  try {
    const raw = localStorage.getItem(COMMENT_REPORTS_KEY);
    const prev = raw ? JSON.parse(raw) : [];
    return Array.isArray(prev) ? prev : [];
  } catch {
    return [];
  }
}

function saveCommentReports(list) {
  try {
    localStorage.setItem(COMMENT_REPORTS_KEY, JSON.stringify(list.slice(0, 300)));
    notifyAdminInboxChanged();
  } catch {
    /* ignore */
  }
}

/**
 * @param {{
 *   restaurantName: string,
 *   commentIndex: number,
 *   commentId?: string,
 *   targetNickname: string,
 *   reporterNickname: string,
 *   commentPreview: string,
 *   reason?: string,
 * }} entry
 */
export function pushCommentReport(entry) {
  if (isApiConfigured() && hasLoginHeader()) {
    return (async () => {
      const rawId = entry.commentId ?? '';
      const commentId = typeof rawId === 'string' ? rawId : String(rawId);
      const res = await apiFetch('/api/comment-reports', {
        method: 'POST',
        headers: { ...loginHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, reason: entry.reason }),
      });
      if (!res.ok) throw new Error((await res.text()) || '댓글 신고 접수 실패');
    })();
  }
  try {
    const list = loadCommentReports();
    const row = {
      ...entry,
      id: `cr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    saveCommentReports([row, ...list]);
  } catch {
    /* ignore */
  }
  return Promise.resolve();
}

export function setCommentReportStatus(reportId, status) {
  if (isApiConfigured() && isApiSession()) {
    return (async () => {
      await apiFetch(`/api/comment-reports/admin/${reportId}`, {
        method: 'PATCH',
        headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    })();
  }
  const list = loadCommentReports().map((r) =>
    r.id === reportId ? { ...r, status, updatedAt: new Date().toISOString() } : r,
  );
  saveCommentReports(list);
  return Promise.resolve();
}

export function removeCommentReport(reportId) {
  if (isApiConfigured() && isApiSession()) {
    return (async () => {
      await apiFetch(`/api/comment-reports/admin/${reportId}`, {
        method: 'DELETE',
        headers: adminHeaders(),
      });
    })();
  }
  saveCommentReports(loadCommentReports().filter((r) => r.id !== reportId));
  return Promise.resolve();
}

export async function fetchCommentReportsFromApi() {
  if (!isApiConfigured()) {
    apiCommentReportCache = null;
    return;
  }
  const res = await apiFetch('/api/comment-reports/admin', { headers: adminHeaders() });
  if (!res.ok) {
    apiCommentReportCache = [];
    notifyAdminInboxChanged();
    return;
  }
  const rows = await res.json();
  apiCommentReportCache = Array.isArray(rows)
    ? rows.map((r) => ({
        ...r,
        commentId: r.commentId,
        commentIndex: 0,
        commentPreview: '',
      }))
    : [];
  notifyAdminInboxChanged();
}
