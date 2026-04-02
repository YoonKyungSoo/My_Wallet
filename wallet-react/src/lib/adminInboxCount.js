import { loadBugReports } from './bugReports';
import { loadCommentReports } from './commentReports';
import { listAllSubmissionsForAdmin } from './pendingRestaurantSubmissions';
import { listPendingUnbanRequests } from './unbanRequests';

function isCommentReportPending(status) {
  if (status == null || status === '') return true;
  const s = String(status).toLowerCase();
  return s !== 'resolved' && s !== 'closed' && s !== 'rejected';
}

/** AdminPage와 동일 기준: 식당 제보 pending, 버그 open, 댓글 신고 미처리, 정지 해제 요청 pending */
export function getAdminPendingInboxCount() {
  const subs = listAllSubmissionsForAdmin().filter((s) => s.status === 'pending').length;
  const bugs = loadBugReports().filter((b) => b.status !== 'closed').length;
  const reports = loadCommentReports().filter((r) => isCommentReportPending(r.status)).length;
  const unbans = listPendingUnbanRequests().length;
  return subs + bugs + reports + unbans;
}
