import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import ImageWithFallback from '../components/ImageWithFallback';
import { isApiConfigured } from '../lib/api';
import { Auth, AUTH_CHANGED, fetchAdminUsersFromApi, isApiSession } from '../lib/auth';
import {
  addApprovedRestaurant,
  loadApprovedRestaurants,
  removeApprovedRestaurant,
  RESTAURANTS_CHANGED,
  updateApprovedRestaurantFull,
} from '../lib/approvedRestaurants';
import {
  fetchBugReportsFromApi,
  loadBugReports,
  removeBugReport,
  setBugReportStatus,
} from '../lib/bugReports';
import {
  fetchCommentReportsFromApi,
  loadCommentReports,
  removeCommentReport,
  setCommentReportStatus,
} from '../lib/commentReports';

function isCommentReportPendingStatus(status) {
  if (status == null || status === '') return true;
  const s = String(status).toLowerCase();
  return s !== 'resolved' && s !== 'closed' && s !== 'rejected';
}
import {
  approveSubmissionOnServer,
  categoryLabelToPlain,
  fetchSubmissionsFromApi,
  listAllSubmissionsForAdmin,
  menuPriceTextToMenuPrices,
  rejectSubmissionOnServer,
  removeSubmission,
  setSubmissionStatus,
} from '../lib/pendingRestaurantSubmissions';
import {
  detailCommentAnchorUrl,
  detailUrlForRestaurant,
  isRestaurantOnMap,
  kakaoMapSearchUrl,
} from '../lib/adminLinks';
import { deleteMapCommentById, deleteMapCommentByIndex, invalidateMapCommentsForRestaurant } from '../lib/mapComments';
import { fetchRestaurantsFromApi, getServerRestaurantsCache } from '../lib/restaurantApi';
import { deleteRestaurantOnServer, updateRestaurantOnServer } from '../lib/restaurantAdminApi';
import {
  clearSiteNotice,
  fetchSiteNoticeFromApi,
  getSiteNotice,
  publishSiteNotice,
} from '../lib/siteNotice';
import {
  fetchUnbanRequestsFromApi,
  listPendingUnbanRequests,
  setUnbanRequestStatus,
  UNBAN_REQUESTS_CHANGED,
} from '../lib/unbanRequests';

const EDIT_CATEGORIES = [
  '한식',
  '중식',
  '일식',
  '양식',
  '분식',
  '면요리',
  '치킨',
  '버거',
  '카페',
  '베이커리',
  '편의점/마트',
  '기타',
];

function formatMenuPriceLine(text) {
  const nums = menuPriceTextToMenuPrices(text);
  return nums.map((n) => `${n.toLocaleString('ko-KR')}원`).join(', ');
}

function OpenMapLink({ query, children }) {
  if (!query?.trim()) return null;
  return (
    <a
      href={kakaoMapSearchUrl(query)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 text-slate-800 text-xs font-extrabold hover:bg-slate-200"
    >
      {children}
    </a>
  );
}

function PhotoStrip({ urls }) {
  if (!urls?.length) {
    return <span className="text-xs font-bold text-slate-400">첨부 사진 없음</span>;
  }
  return (
    <div className="flex gap-2 overflow-x-auto py-1 pb-2">
      {urls.slice(0, 8).map((u, i) => (
        <a
          key={`photo-strip-${i}`}
          href={u}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 block"
        >
          <img src={u} alt="" className="h-16 w-16 object-cover rounded-xl border border-slate-200" />
        </a>
      ))}
    </div>
  );
}

export default function AdminPage() {
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const pendingSubs = useMemo(() => listAllSubmissionsForAdmin().filter((s) => s.status === 'pending'), [tick]);
  const allSubs = useMemo(() => listAllSubmissionsForAdmin(), [tick]);
  const approvedList = useMemo(() => {
    if (isApiConfigured()) return getServerRestaurantsCache();
    return loadApprovedRestaurants();
  }, [tick]);
  const allBugs = useMemo(() => loadBugReports(), [tick]);
  const allReports = useMemo(() => loadCommentReports(), [tick]);

  const bugs = useMemo(() => allBugs.filter((b) => b.status !== 'closed'), [allBugs]);
  const reports = useMemo(() => allReports.filter((r) => isCommentReportPendingStatus(r.status)), [allReports]);

  const [histSubFilter, setHistSubFilter] = useState('all');
  const [histBugFilter, setHistBugFilter] = useState('all');
  const [histReportFilter, setHistReportFilter] = useState('all');
  const [mainTab, setMainTab] = useState('register');

  const pendingUnbans = useMemo(() => listPendingUnbanRequests(), [tick]);

  const [noticeBody, setNoticeBody] = useState(() => getSiteNotice().text);
  const syncNoticeField = useCallback(() => setNoticeBody(getSiteNotice().text), []);

  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    window.addEventListener(UNBAN_REQUESTS_CHANGED, bump);
    return () => window.removeEventListener(UNBAN_REQUESTS_CHANGED, bump);
  }, []);

  useEffect(() => {
    if (!isApiConfigured()) return undefined;

    const loadAdminConsoleFromApi = async () => {
      if (!Auth.isAdmin() || !Auth.getSession()?.id) return;
      await Promise.all([
        fetchSubmissionsFromApi(),
        fetchRestaurantsFromApi(),
        fetchSiteNoticeFromApi(),
        fetchBugReportsFromApi(),
        fetchCommentReportsFromApi(),
        fetchUnbanRequestsFromApi(),
      ]);
      setNoticeBody(getSiteNotice().text);
      refresh();
    };

    void loadAdminConsoleFromApi();

    const onAuth = () => {
      void loadAdminConsoleFromApi();
    };
    window.addEventListener(AUTH_CHANGED, onAuth);
    return () => window.removeEventListener(AUTH_CHANGED, onAuth);
  }, [refresh]);

  const filteredHistSubs = useMemo(() => {
    if (histSubFilter === 'all') return [...allSubs].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return allSubs.filter((s) => s.status === histSubFilter);
  }, [allSubs, histSubFilter]);

  const filteredHistBugs = useMemo(() => {
    if (histBugFilter === 'all') return [...allBugs].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return allBugs.filter((b) => b.status === histBugFilter);
  }, [allBugs, histBugFilter]);

  const filteredHistReports = useMemo(() => {
    if (histReportFilter === 'all') {
      return [...allReports].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    }
    return allReports.filter((r) => r.status === histReportFilter);
  }, [allReports, histReportFilter]);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);

  const [userRows, setUserRows] = useState([]);
  const [userRowsLoading, setUserRowsLoading] = useState(false);

  useEffect(() => {
    if (!Auth.isAdmin()) {
      setUserRows([]);
      setUserRowsLoading(false);
      return undefined;
    }
    if (isApiSession()) {
      setUserRowsLoading(true);
      let cancelled = false;
      fetchAdminUsersFromApi()
        .then((rows) => {
          if (!cancelled) setUserRows(rows || []);
        })
        .finally(() => {
          if (!cancelled) setUserRowsLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }
    setUserRowsLoading(false);
    setUserRows(Auth.adminListUsers() || []);
    return undefined;
  }, [tick]);

  const openEditApproved = (r) => {
    setEditForm({
      approvedId: r.approvedId,
      name: r.name || '',
      address: r.address || '',
      category: EDIT_CATEGORIES.includes(r.category) ? r.category : r.category || '기타',
      rating: String(r.rating ?? '4'),
      menuPriceLine:
        Array.isArray(r.menuPrices) && r.menuPrices.length
          ? r.menuPrices.map((n) => `${Number(n).toLocaleString('ko-KR')}원`).join(', ')
          : '5000',
      menuName: r.menuName || '',
      menuPriceLabel: r.menuPriceLabel || '',
    });
    setEditOpen(true);
  };

  const saveEditApproved = async () => {
    if (!editForm) return;
    const menuPrices = menuPriceTextToMenuPrices(editForm.menuPriceLine);
    const patch = {
      name: editForm.name.trim(),
      address: editForm.address.trim(),
      category: editForm.category,
      rating: editForm.rating,
      menuPrices,
      menuName: editForm.menuName?.trim() || '',
      menuPriceLabel: editForm.menuPriceLabel?.trim() || '',
    };
    const res = isApiConfigured()
      ? await updateRestaurantOnServer(editForm.approvedId, patch)
      : updateApprovedRestaurantFull(editForm.approvedId, patch);
    if (!res.ok) {
      alert(res.reason || '저장에 실패했습니다.');
      return;
    }
    if (isApiConfigured()) {
      await fetchRestaurantsFromApi();
      window.dispatchEvent(new Event(RESTAURANTS_CHANGED));
    }
    setEditOpen(false);
    setEditForm(null);
    refresh();
    alert('승인 식당 정보가 수정되었습니다.');
  };

  const adminDeleteReportedComment = async (rep) => {
    if (!window.confirm('신고된 댓글을 삭제할까요?')) return;
    const name = rep.restaurantName?.trim();
    if (!name) return;
    if (rep.commentId) {
      await deleteMapCommentById(name, rep.commentId);
    } else if (!isApiConfigured() && typeof rep.commentIndex === 'number') {
      deleteMapCommentByIndex(name, rep.commentIndex);
    } else {
      alert('댓글 ID가 없어 삭제할 수 없습니다. 해당 식당 상세에서 직접 확인해 주세요.');
      return;
    }
    refresh();
  };

  const approveSubmission = async (sub) => {
    const name = sub.restaurantName?.trim();
    if (name && isRestaurantOnMap(name)) {
      alert(
        '이미 지도에 같은 이름의 식당이 있습니다. 승인 식당 탭에서 수정하거나, 제보를 삭제 후 이름을 구분해 다시 접수받으세요.',
      );
      return;
    }
    if (isApiConfigured()) {
      const res = await approveSubmissionOnServer(sub.id);
      if (!res.ok) {
        alert(res.reason || '승인 처리에 실패했습니다. 다시 시도해 주세요.');
        return;
      }
      await fetchRestaurantsFromApi();
      await fetchSubmissionsFromApi();
      window.dispatchEvent(new Event(RESTAURANTS_CHANGED));
      refresh();
      alert(`「${sub.restaurantName}」이(가) 지도에 반영되었습니다.`);
      return;
    }
    const plainCat = categoryLabelToPlain(sub.category);
    const menuPrices = menuPriceTextToMenuPrices(sub.menuPrice);
    addApprovedRestaurant({
      name: sub.restaurantName?.trim(),
      category: plainCat,
      rating: String(sub.rating ?? '4'),
      address: sub.restaurantAddress?.trim() || '',
      recommendCount: 0,
      reviewCount: 0,
      menuPrices,
      menuName: sub.menuName?.trim() || '',
      menuPriceLabel: sub.menuPrice?.trim() || '',
      photos: Array.isArray(sub.photos) ? sub.photos : [],
      phone: '',
    });
    setSubmissionStatus(sub.id, 'approved');
    refresh();
    alert(`「${sub.restaurantName}」이(가) 지도에 반영되었습니다.`);
  };

  const rejectSubmission = async (sub) => {
    if (!window.confirm(`「${sub.restaurantName}」제보를 반려할까요?`)) return;
    if (isApiConfigured()) {
      const res = await rejectSubmissionOnServer(sub.id);
      if (!res.ok) {
        alert(res.reason || '반려 처리에 실패했습니다. 다시 시도해 주세요.');
        return;
      }
      await fetchSubmissionsFromApi();
      refresh();
      return;
    }
    setSubmissionStatus(sub.id, 'rejected');
    refresh();
  };

  return (
    <Layout showSearch={false} showAddButton={false}>
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 pb-24">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-extrabold text-orange-600 uppercase tracking-wider">Admin</p>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">관리자 콘솔</h1>
            <p className="text-sm text-slate-500 mt-1">식당 제보 승인·버그·댓글 신고·회원·공지를 관리합니다.</p>
          </div>
          <Link
            to="/"
            className="px-4 py-2 rounded-xl bg-slate-100 font-bold text-slate-700 hover:bg-slate-200 text-sm"
          >
            홈으로
          </Link>
        </div>

        <section className="mb-10 rounded-2xl border border-amber-200 bg-amber-50/50 p-5 space-y-3">
          <h2 className="text-lg font-extrabold text-slate-900">메인 화면 공지</h2>
          <p className="text-xs font-bold text-slate-600">
            내용을 입력한 뒤 「공지 발표」를 누르면 메인 상단에 표시됩니다. 「공지 내리기」로 즉시 숨깁니다.
          </p>
          <textarea
            value={noticeBody}
            onChange={(e) => setNoticeBody(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
            placeholder="공지 내용을 입력하세요"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="px-4 py-2 rounded-xl bg-orange-600 text-white text-sm font-extrabold hover:bg-orange-700"
              onClick={async () => {
                try {
                  await publishSiteNotice(noticeBody);
                  syncNoticeField();
                  alert('공지가 반영되었습니다.');
                } catch (e) {
                  alert(e?.message || '공지 저장에 실패했습니다.');
                }
              }}
            >
              공지 발표
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-xl bg-slate-200 text-slate-800 text-sm font-extrabold hover:bg-slate-300"
              onClick={async () => {
                try {
                  await clearSiteNotice();
                  setNoticeBody('');
                  alert('공지를 내렸습니다.');
                } catch (e) {
                  alert(e?.message || '처리에 실패했습니다.');
                }
              }}
            >
              공지 내리기
            </button>
          </div>
        </section>

        <nav className="mb-6 flex flex-wrap gap-2 p-2 bg-white rounded-2xl border border-slate-200 shadow-sm">
          {[
            { id: 'register', label: '식당 등록', badge: pendingSubs.length },
            { id: 'bugs', label: '버그 제보', badge: bugs.length },
            { id: 'reports', label: '댓글 신고', badge: reports.length },
            { id: 'members', label: '회원 관리', badge: pendingUnbans.length },
            { id: 'approved', label: '승인 식당', badge: approvedList.length },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setMainTab(t.id)}
              className={`flex-1 min-w-[100px] px-3 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
                mainTab === t.id
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {t.label}
              {t.badge > 0 ? (
                <span className="ml-1 tabular-nums opacity-90"> {t.badge}</span>
              ) : null}
            </button>
          ))}
        </nav>

        {mainTab === 'register' ? (
        <>
        <section className="mb-12 space-y-4">
          <h2 className="text-lg font-extrabold text-slate-900 border-b border-orange-100 pb-2">
            식당 등록 제보 <span className="text-orange-600">({pendingSubs.length})</span>
          </h2>
          {pendingSubs.length === 0 ? (
            <p className="text-sm font-bold text-slate-400">대기 중인 제보가 없습니다.</p>
          ) : (
            <ul className="space-y-3">
              {pendingSubs.map((sub) => (
                <li
                  key={sub.id}
                  className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm space-y-2"
                >
                  <p className="font-extrabold text-slate-900">{sub.restaurantName}</p>
                  <p className="text-xs text-slate-500">{sub.restaurantAddress}</p>
                  <p className="text-sm text-slate-700">
                    {sub.category} · {sub.menuName} · {sub.menuPrice} · ★{sub.rating}
                  </p>
                  <PhotoStrip urls={sub.photos} />
                  <p className="text-[11px] text-slate-400">
                    {sub.createdAt ? new Date(sub.createdAt).toLocaleString('ko-KR') : ''}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {isRestaurantOnMap(sub.restaurantName) ? (
                      <Link
                        to={detailUrlForRestaurant(sub.restaurantName)}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-orange-50 text-orange-800 text-xs font-extrabold border border-orange-200 hover:bg-orange-100"
                      >
                        동일 이름 상세 보기
                      </Link>
                    ) : null}
                    <OpenMapLink query={sub.restaurantAddress || sub.restaurantName}>
                      카카오맵에서 주소·이름 검색
                    </OpenMapLink>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-orange-50">
                    <button
                      type="button"
                      onClick={() => approveSubmission(sub)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-extrabold hover:bg-emerald-700"
                    >
                      수락 → 지도 반영
                    </button>
                    <button
                      type="button"
                      onClick={() => rejectSubmission(sub)}
                      className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-extrabold hover:bg-slate-200"
                    >
                      반려
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm('이 제보를 목록에서 완전히 삭제할까요?')) return;
                        const ok = await removeSubmission(sub.id);
                        if (!ok) {
                          alert('제보 삭제에 실패했습니다.');
                          return;
                        }
                        refresh();
                      }}
                      className="px-4 py-2 rounded-xl border-2 border-red-200 text-red-700 text-sm font-extrabold hover:bg-red-50"
                    >
                      제보 삭제
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mb-10 rounded-2xl border border-slate-100 bg-white p-4 space-y-3 shadow-sm">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800">전체 제보 이력</h3>
            <p className="text-[11px] font-bold text-slate-500 mt-1">
              반려된 제보는 아래에서 「다시 승인 → 지도 반영」으로 나중에 등록할 수 있습니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: '전체' },
              { id: 'pending', label: '대기' },
              { id: 'approved', label: '승인됨' },
              { id: 'rejected', label: '반려' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setHistSubFilter(f.id)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold ${
                  histSubFilter === f.id ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <ul className="space-y-2 max-h-[min(70vh,28rem)] overflow-y-auto pr-1 text-sm">
            {filteredHistSubs.length === 0 ? (
              <p className="text-sm font-bold text-slate-400">기록이 없습니다.</p>
            ) : (
              filteredHistSubs.map((sub) => (
                <li key={sub.id} className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 space-y-2">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-bold text-slate-900">{sub.restaurantName}</span>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        sub.status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : sub.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {sub.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    {sub.category} · {sub.menuName} · {sub.menuPrice} · ★{sub.rating}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {sub.createdAt ? new Date(sub.createdAt).toLocaleString('ko-KR') : ''}
                  </p>
                  {sub.status === 'rejected' || sub.status === 'pending' ? (
                    <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-200/80">
                      <button
                        type="button"
                        onClick={() => approveSubmission(sub)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-extrabold hover:bg-emerald-700"
                      >
                        {sub.status === 'rejected' ? '다시 승인 → 지도 반영' : '수락 → 지도 반영'}
                      </button>
                      {sub.status === 'pending' ? (
                        <button
                          type="button"
                          onClick={() => rejectSubmission(sub)}
                          className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-800 text-xs font-extrabold hover:bg-slate-300"
                        >
                          반려
                        </button>
                      ) : null}
                      <OpenMapLink query={sub.restaurantAddress || sub.restaurantName}>카카오맵</OpenMapLink>
                      {isRestaurantOnMap(sub.restaurantName) ? (
                        <Link
                          to={detailUrlForRestaurant(sub.restaurantName)}
                          className="px-3 py-1.5 rounded-lg bg-orange-50 text-orange-800 text-xs font-extrabold border border-orange-200"
                        >
                          상세
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        onClick={async () => {
                          if (!window.confirm('이 제보 기록을 삭제할까요?')) return;
                          const ok = await removeSubmission(sub.id);
                          if (!ok) {
                            alert('제보 삭제에 실패했습니다.');
                            return;
                          }
                          refresh();
                        }}
                        className="px-3 py-1.5 rounded-lg border border-red-200 text-red-700 text-xs font-extrabold hover:bg-red-50"
                      >
                        삭제
                      </button>
                    </div>
                  ) : sub.status === 'approved' ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {isRestaurantOnMap(sub.restaurantName) ? (
                        <Link
                          to={detailUrlForRestaurant(sub.restaurantName)}
                          className="px-3 py-1.5 rounded-lg bg-orange-50 text-orange-800 text-xs font-extrabold border border-orange-200"
                        >
                          지도 식당 상세
                        </Link>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-400">
                          (동일 이름 식당이 목록에 없습니다. 필요 시 다시 제보를 받으세요.)
                        </span>
                      )}
                    </div>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </div>
        </>
        ) : null}

        {mainTab === 'approved' ? (
        <section className="mb-12 space-y-4">
          <h2 className="text-lg font-extrabold text-slate-900 border-b border-orange-100 pb-2">
            승인된 식당 (지도 노출) <span className="text-orange-600">({approvedList.length})</span>
          </h2>
          {approvedList.length === 0 ? (
            <p className="text-sm font-bold text-slate-400">승인된 사용자 제보 식당이 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {approvedList.map((r) => (
                <li
                  key={r.approvedId}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3"
                >
                  <div className="min-w-0 flex-1 flex gap-3">
                    {r.photos?.[0] ? (
                      <ImageWithFallback
                        src={r.photos[0]}
                        alt=""
                        className="h-14 w-14 rounded-lg object-cover border border-orange-100 shrink-0"
                      />
                    ) : null}
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900">{r.name}</p>
                      <p className="text-xs text-slate-500">{r.address}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditApproved(r)}
                      className="px-3 py-2 rounded-xl bg-white border border-emerald-200 text-emerald-800 text-xs font-extrabold hover:bg-emerald-50"
                    >
                      수정
                    </button>
                    <Link
                      to={detailUrlForRestaurant(r.name)}
                      className="px-3 py-2 rounded-xl bg-white border border-orange-200 text-orange-700 text-xs font-extrabold hover:bg-orange-50"
                    >
                      상세 보기
                    </Link>
                    <OpenMapLink query={r.address}>카카오맵</OpenMapLink>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm(`「${r.name}」을(를) 지도·목록에서 삭제할까요?`)) return;
                        if (isApiConfigured()) {
                          const res = await deleteRestaurantOnServer(r.approvedId);
                          if (!res.ok) {
                            alert(res.reason || '삭제에 실패했습니다.');
                            return;
                          }
                          invalidateMapCommentsForRestaurant(r.name);
                          await fetchRestaurantsFromApi();
                          window.dispatchEvent(new Event(RESTAURANTS_CHANGED));
                        } else {
                          removeApprovedRestaurant(r.approvedId);
                        }
                        refresh();
                      }}
                      className="px-3 py-2 rounded-xl bg-red-600 text-white text-xs font-extrabold hover:bg-red-700"
                    >
                      식당 삭제
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        ) : null}

        {mainTab === 'bugs' ? (
        <>
        <section className="mb-12 space-y-4">
          <h2 className="text-lg font-extrabold text-slate-900 border-b border-orange-100 pb-2">
            버그 제보 <span className="text-orange-600">({bugs.length})</span>
          </h2>
          {bugs.length === 0 ? (
            <p className="text-sm font-bold text-slate-400">새 버그 제보가 없습니다.</p>
          ) : (
            <ul className="space-y-3">
              {bugs.map((b) => (
                <li key={b.id} className="rounded-2xl border border-slate-100 bg-white p-4 text-sm">
                  <button
                    type="button"
                    className="text-left w-full rounded-xl -m-1 p-1 hover:bg-slate-50 transition-colors"
                    onClick={() => {
                      const name = b.restaurantName?.trim();
                      if (name && isRestaurantOnMap(name)) {
                        navigate(detailUrlForRestaurant(name));
                        return;
                      }
                      const q = b.restaurantAddress?.trim() || name;
                      if (q) window.open(kakaoMapSearchUrl(q), '_blank', 'noopener,noreferrer');
                    }}
                  >
                    <p className="font-extrabold text-slate-900">
                      {b.restaurantName || '—'}{' '}
                      <span className="text-xs font-bold text-orange-600">(클릭 → 상세 또는 카카오맵)</span>
                    </p>
                  </button>
                  <PhotoStrip urls={b.photos} />
                  <p className="text-slate-600 mt-2 whitespace-pre-wrap">{b.bugDescription}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{b.createdAt}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {b.restaurantName?.trim() && isRestaurantOnMap(b.restaurantName) ? (
                      <Link
                        to={detailUrlForRestaurant(b.restaurantName)}
                        className="px-3 py-2 rounded-xl bg-orange-50 text-orange-800 text-xs font-extrabold border border-orange-200"
                      >
                        식당 상세
                      </Link>
                    ) : null}
                    <OpenMapLink query={b.restaurantAddress || b.restaurantName}>카카오맵 열기</OpenMapLink>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={async () => {
                        await setBugReportStatus(b.id, 'closed');
                        if (isApiConfigured()) await fetchBugReportsFromApi();
                        refresh();
                      }}
                      className="text-xs font-extrabold text-emerald-600 hover:underline"
                    >
                      처리 완료
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm('이 제보를 삭제할까요?')) return;
                        await removeBugReport(b.id);
                        if (isApiConfigured()) await fetchBugReportsFromApi();
                        refresh();
                      }}
                      className="text-xs font-extrabold text-red-600 hover:underline"
                    >
                      삭제
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mb-10 rounded-2xl border border-slate-100 bg-white p-4 space-y-3 shadow-sm">
          <h3 className="text-sm font-extrabold text-slate-800">버그 제보 이력</h3>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: '전체' },
              { id: 'open', label: '접수' },
              { id: 'closed', label: '처리완료' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setHistBugFilter(f.id)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold ${
                  histBugFilter === f.id ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <ul className="space-y-2 max-h-56 overflow-y-auto text-sm">
            {filteredHistBugs.length === 0 ? (
              <p className="text-sm font-bold text-slate-400">기록이 없습니다.</p>
            ) : (
              filteredHistBugs.map((b) => (
                <li key={b.id} className="rounded-lg border border-slate-100 bg-slate-50/80 p-2">
                  <span className="font-bold text-slate-900">{b.restaurantName || '—'}</span>
                  <span className="text-[10px] text-slate-500 ml-2">{b.status}</span>
                </li>
              ))
            )}
          </ul>
        </div>
        </>
        ) : null}

        {mainTab === 'reports' ? (
        <>
        <section className="mb-12 space-y-4">
          <h2 className="text-lg font-extrabold text-slate-900 border-b border-orange-100 pb-2">
            댓글 신고 <span className="text-orange-600">({reports.length})</span>
          </h2>
          {reports.length === 0 ? (
            <p className="text-sm font-bold text-slate-400">처리할 댓글 신고가 없습니다.</p>
          ) : (
            <ul className="space-y-3">
              {reports.map((r) => (
                <li key={r.id} className="rounded-2xl border border-slate-100 bg-white p-4 text-sm">
                  <button
                    type="button"
                    className="text-left w-full rounded-xl -m-1 p-1 hover:bg-slate-50 transition-colors"
                    onClick={() => {
                      const name = r.restaurantName?.trim();
                      if (name && isRestaurantOnMap(name)) {
                        navigate(`${detailUrlForRestaurant(name)}#map-reviews`);
                      } else if (name) {
                        window.open(kakaoMapSearchUrl(name), '_blank', 'noopener,noreferrer');
                      }
                    }}
                  >
                    <p className="font-extrabold text-slate-900">
                      {r.restaurantName}{' '}
                      <span className="text-xs font-bold text-orange-600">
                        (클릭 → 해당 식당 댓글 구역)
                      </span>
                    </p>
                  </button>
                  <p className="text-slate-500 text-xs mt-1">
                    신고자 {r.reporterNickname} → {r.targetNickname}
                  </p>
                  <p className="text-slate-600 mt-2">사유: {r.reason}</p>
                  <p className="text-xs text-slate-400 mt-1">미리보기: {r.commentPreview}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {r.restaurantName?.trim() && isRestaurantOnMap(r.restaurantName) ? (
                      <Link
                        to={detailCommentAnchorUrl(r.restaurantName, r.commentId, r.commentIndex)}
                        className="px-3 py-2 rounded-xl bg-orange-50 text-orange-800 text-xs font-extrabold border border-orange-200"
                      >
                        해당 댓글로 이동
                      </Link>
                    ) : (
                      <OpenMapLink query={r.restaurantName}>카카오맵 검색</OpenMapLink>
                    )}
                    <button
                      type="button"
                      onClick={() => adminDeleteReportedComment(r)}
                      className="px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-extrabold hover:bg-red-100"
                    >
                      댓글 삭제
                    </button>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={async () => {
                        await setCommentReportStatus(r.id, 'resolved');
                        if (isApiConfigured()) await fetchCommentReportsFromApi();
                        refresh();
                      }}
                      className="text-xs font-extrabold text-emerald-600 hover:underline"
                    >
                      검토 완료(보관)
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm('신고 기록을 삭제할까요?')) return;
                        await removeCommentReport(r.id);
                        if (isApiConfigured()) await fetchCommentReportsFromApi();
                        refresh();
                      }}
                      className="text-xs font-extrabold text-red-600 hover:underline"
                    >
                      삭제
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mb-10 rounded-2xl border border-slate-100 bg-white p-4 space-y-3 shadow-sm">
          <h3 className="text-sm font-extrabold text-slate-800">댓글 신고 이력</h3>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: '전체' },
              { id: 'open', label: '미처리' },
              { id: 'resolved', label: '검토완료' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setHistReportFilter(f.id)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold ${
                  histReportFilter === f.id ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <ul className="space-y-2 max-h-56 overflow-y-auto text-xs">
            {filteredHistReports.length === 0 ? (
              <p className="text-sm font-bold text-slate-400">기록이 없습니다.</p>
            ) : (
              filteredHistReports.map((r) => (
                <li key={r.id} className="rounded-lg border border-slate-100 bg-slate-50/80 p-2">
                  <span className="font-extrabold text-slate-800">{r.restaurantName}</span> — {r.status}
                  <p className="text-slate-500 mt-0.5">{r.reason}</p>
                </li>
              ))
            )}
          </ul>
        </div>
        </>
        ) : null}

        {mainTab === 'members' ? (
        <section className="mb-8 space-y-4">
          <h2 className="text-lg font-extrabold text-slate-900 border-b border-orange-100 pb-2">회원 관리</h2>
          {pendingUnbans.length > 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
              <h3 className="text-sm font-extrabold text-amber-900">정지 해제 요청 ({pendingUnbans.length})</h3>
              <ul className="space-y-2">
                {pendingUnbans.map((req) => {
                  const nick = userRows.find((x) => x.id === req.userId)?.nickname || '—';
                  return (
                    <li
                      key={req.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white border border-amber-100 p-3 text-sm"
                    >
                      <span className="font-bold text-slate-800">
                        {nick} <span className="text-xs text-slate-500">({req.userId})</span>
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {req.createdAt ? new Date(req.createdAt).toLocaleString('ko-KR') : ''}
                      </span>
                      <div className="flex gap-2 w-full sm:w-auto justify-end">
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-extrabold"
                          onClick={async () => {
                            const r = await Auth.adminSetUserBanned(req.userId, false);
                            if (!r.ok) {
                              alert(r.reason);
                              return;
                            }
                            await setUnbanRequestStatus(req.id, 'approved');
                            if (isApiConfigured()) await fetchUnbanRequestsFromApi();
                            refresh();
                          }}
                        >
                          정지 해제
                        </button>
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-800 text-xs font-extrabold"
                          onClick={async () => {
                            await setUnbanRequestStatus(req.id, 'rejected');
                            if (isApiConfigured()) await fetchUnbanRequestsFromApi();
                            refresh();
                          }}
                        >
                          요청 거절
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
          {userRowsLoading ? (
            <p className="text-sm font-bold text-slate-400">사용자 목록을 불러오는 중…</p>
          ) : userRows.length === 0 ? (
            <p className="text-sm font-bold text-slate-400">등록된 사용자가 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {userRows.map((u) => (
                <li
                  key={u.id}
                  className="rounded-xl border border-slate-100 bg-white p-4 flex flex-wrap items-center gap-3 justify-between"
                >
                  <div>
                    <p className="font-extrabold text-slate-900">
                      {u.nickname}{' '}
                      <span className="text-xs font-bold text-slate-500">({u.id})</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      역할: {u.role}
                      {u.banned ? ' · 정지됨' : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="px-2 py-1.5 rounded-lg bg-slate-100 text-xs font-extrabold text-slate-700"
                      onClick={async () => {
                        const next = u.role === 'admin' ? 'user' : 'admin';
                        const res = await Auth.adminSetUserRole(u.id, next);
                        if (!res.ok) alert(res.reason);
                        else refresh();
                      }}
                    >
                      역할 전환
                    </button>
                    <button
                      type="button"
                      className="px-2 py-1.5 rounded-lg bg-amber-100 text-xs font-extrabold text-amber-900"
                      onClick={async () => {
                        let reason = '';
                        if (!u.banned) {
                          const input = window.prompt('정지 사유를 입력해 주세요. (비워두면 기본 문구 적용)');
                          if (input === null) return;
                          reason = input.trim();
                        }
                        const res = await Auth.adminSetUserBanned(u.id, !u.banned, reason);
                        if (!res.ok) alert(res.reason);
                        else refresh();
                      }}
                    >
                      {u.banned ? '정지 해제' : '정지'}
                    </button>
                    <button
                      type="button"
                      className="px-2 py-1.5 rounded-lg bg-red-50 text-xs font-extrabold text-red-700"
                      onClick={async () => {
                        if (!window.confirm(`「${u.id}」계정을 삭제할까요?`)) return;
                        const res = await Auth.adminDeleteUser(u.id);
                        if (!res.ok) alert(res.reason);
                        else refresh();
                      }}
                    >
                      삭제
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        ) : null}
      </main>

      {editOpen && editForm ? (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <h3 className="text-lg font-extrabold text-slate-900">승인 식당 수정</h3>
            <label className="block text-xs font-bold text-slate-500">
              이름
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </label>
            <label className="block text-xs font-bold text-slate-500">
              주소
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"
                value={editForm.address}
                onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
              />
            </label>
            <label className="block text-xs font-bold text-slate-500">
              카테고리
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"
                value={editForm.category}
                onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
              >
                {EDIT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-bold text-slate-500">
              평점 (표시용)
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"
                value={editForm.rating}
                onChange={(e) => setEditForm((f) => ({ ...f, rating: e.target.value }))}
              />
            </label>
            <label className="block text-xs font-bold text-slate-500">
              가격대 (숫자·쉼표·원 등, 예: 5000, 7000)
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"
                value={editForm.menuPriceLine}
                onChange={(e) => setEditForm((f) => ({ ...f, menuPriceLine: e.target.value }))}
                onBlur={(e) => setEditForm((f) => ({ ...f, menuPriceLine: formatMenuPriceLine(e.target.value) }))}
              />
            </label>
            <label className="block text-xs font-bold text-slate-500">
              대표 메뉴명 (상세 표시)
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"
                value={editForm.menuName}
                onChange={(e) => setEditForm((f) => ({ ...f, menuName: e.target.value }))}
              />
            </label>
            <label className="block text-xs font-bold text-slate-500">
              메뉴 가격 표시문구 (상세, 예: 8,000원)
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"
                value={editForm.menuPriceLabel}
                onChange={(e) => setEditForm((f) => ({ ...f, menuPriceLabel: e.target.value }))}
              />
            </label>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                className="px-4 py-2 rounded-xl bg-slate-100 font-extrabold text-sm text-slate-700"
                onClick={() => {
                  setEditOpen(false);
                  setEditForm(null);
                }}
              >
                취소
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-xl bg-orange-600 font-extrabold text-sm text-white"
                onClick={saveEditApproved}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Layout>
  );
}
