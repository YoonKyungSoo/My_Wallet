import { isApiConfigured } from './api.js';
import { Auth } from './auth.js';
import { fetchBugReportsFromApi } from './bugReports.js';
import { fetchCommentReportsFromApi } from './commentReports.js';
import { fetchSubmissionsFromApi } from './pendingRestaurantSubmissions.js';
import { fetchUnbanRequestsFromApi } from './unbanRequests.js';

/**
 * 관리자 헤더 배지용: API 모드에서 대기 건수 캐시를 채웁니다.
 * (isApiSession에만 의존하면 source 플래그가 없는 세션에서 fetch가 생략되어 빈 목록이 됩니다.)
 */
export async function refreshAdminInboxCaches() {
  if (!isApiConfigured() || !Auth.isAdmin() || !Auth.getSession()?.id) return;
  await Promise.all([
    fetchSubmissionsFromApi(),
    fetchBugReportsFromApi(),
    fetchCommentReportsFromApi(),
    fetchUnbanRequestsFromApi(),
  ]);
}
