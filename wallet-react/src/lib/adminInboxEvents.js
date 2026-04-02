/** 관리자 대기 건수(제보·신고·해제 요청) 갱신용 — localStorage 동기 갱신 */
export const ADMIN_INBOX_CHANGED = 'wallet-admin-inbox-changed';

export function notifyAdminInboxChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ADMIN_INBOX_CHANGED));
  }
}
