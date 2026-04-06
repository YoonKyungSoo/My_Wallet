import Layout from '../components/Layout';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { isApiConfigured } from '../lib/api';
import { Auth, AUTH_CHANGED, fetchMyStatsFromApi } from '../lib/auth';
import { LEVEL_TITLES } from '../lib/profileBadges';
import {
  ACTIVITY_HISTORY_CHANGED,
  fetchActivityHistoryFromApi,
  loadActivityHistoryForUser,
} from '../lib/activityHistory';

const HALL_OF_FAME_BADGES = [
  { level: 1, title: '첫 제보 완료', desc: '식당 등록 1회', icon: 'lucide:flag', tone: 'bg-orange-100 text-orange-600', check: (s) => s.reportCount >= 1 },
  { level: 2, title: '포토 스포터', desc: '사진 포함 식당 등록 1회', icon: 'lucide:camera', tone: 'bg-cyan-100 text-cyan-600', check: (s) => s.photoReportCount >= 1 },
  { level: 3, title: '동네 개척자', desc: '식당 등록 5회', icon: 'lucide:map-pinned', tone: 'bg-lime-100 text-lime-600', check: (s) => s.reportCount >= 5 },
  { level: 4, title: '댓글쌔싹', desc: '댓글 10회', icon: 'lucide:message-circle', tone: 'bg-green-100 text-green-600', check: (s) => s.commentCount >= 10 },
  { level: 5, title: '가게 발굴왕', desc: '식당 등록 20회', icon: 'lucide:pickaxe', tone: 'bg-amber-100 text-amber-700', check: (s) => s.reportCount >= 20 },
  { level: 6, title: '댓글 장인', desc: '댓글 100회', icon: 'lucide:messages-square', tone: 'bg-emerald-100 text-emerald-700', check: (s) => s.commentCount >= 100 },
  { level: 7, title: '별점 큐레이터', desc: '평점 작성 50회', icon: 'lucide:star', tone: 'bg-yellow-100 text-yellow-700', check: (s) => s.ratingCount >= 50 },
  { level: 8, title: '저장 콜렉터', desc: '즐겨찾기 30개', icon: 'lucide:bookmark', tone: 'bg-rose-100 text-rose-600', check: (s) => s.savedRestaurantCount >= 30 },
  { level: 9, title: '꾸준한 탐험가', desc: '7일 연속 활동', icon: 'lucide:calendar-check', tone: 'bg-indigo-100 text-indigo-600', check: (s) => s.streakDays >= 7 },
  { level: 10, title: '신뢰의 아이콘', desc: '댓글 100회 + 식당 등록 100회', icon: 'lucide:badge-check', tone: 'bg-violet-100 text-violet-600', check: (s) => s.commentCount >= 100 && s.reportCount >= 100 },
];
export default function ProfilePage() {
  const navigate = useNavigate();
  const [historyTick, setHistoryTick] = useState(0);
  const [stats, setStats] = useState({
    reportCount: 0,
    photoReportCount: 0,
    savedRestaurantCount: 0,
    badgeCount: 0,
    commentCount: 0,
    ratingCount: 0,
    streakDays: 0,
  });

  useEffect(() => {
    const bump = () => setHistoryTick((t) => t + 1);
    window.addEventListener(ACTIVITY_HISTORY_CHANGED, bump);
    window.addEventListener(AUTH_CHANGED, bump);
    return () => {
      window.removeEventListener(ACTIVITY_HISTORY_CHANGED, bump);
      window.removeEventListener(AUTH_CHANGED, bump);
    };
  }, []);

  useEffect(() => {
    if (!isApiConfigured() || !Auth.getSession()?.id) return;
    void fetchActivityHistoryFromApi();
  }, []);

  useEffect(() => {
    if (!isApiConfigured() || !Auth.getSession()?.id) return;
    let cancelled = false;
    void fetchMyStatsFromApi().then((s) => {
      if (cancelled || !s) return;
      setStats({
        reportCount: Number(s.reportCount || 0),
        photoReportCount: Number(s.photoReportCount || 0),
        savedRestaurantCount: Number(s.savedRestaurantCount || 0),
        badgeCount: Number(s.badgeCount || 0),
        commentCount: Number(s.commentCount || 0),
        ratingCount: Number(s.ratingCount || 0),
        streakDays: Number(s.streakDays || 0),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [historyTick]);

  const session = Auth.getSession();

  const historyItems = useMemo(() => {
    const uid = session?.id;
    if (!uid) return [];
    const rows = loadActivityHistoryForUser(uid).filter((x) => x.type === 'comment');
    return rows.slice(0, 20).map((x) => ({
      id: x.id || x.createdAt,
      type: 'comment',
      restaurantName: x.restaurantName || '',
      date: `${new Date(x.createdAt).toLocaleDateString('ko-KR')} · 댓글 작성`,
      title: `"${x.text || ''}"`,
      desc: `${x.restaurantName || '식당'}에 댓글을 남겼습니다.`,
    }));
  }, [session?.id, historyTick]);
  const nickname = session?.nickname || '사용자';
  const bio = session?.bio?.trim() || '간단한 자기소개가 아직 없습니다.';
  const profileImage = session?.profileImage || '';
  const achievedBadges = HALL_OF_FAME_BADGES.filter((b) => b.check(stats));
  const achievedCount = achievedBadges.length;
  const currentLevel = achievedCount;
  const currentLevelTitle = achievedCount > 0
    ? LEVEL_TITLES[Math.max(0, Math.min(LEVEL_TITLES.length - 1, currentLevel - 1))]
    : '등급 미달성';
  const progressPercent = Math.min(100, (achievedCount / HALL_OF_FAME_BADGES.length) * 100);
  const nextTitle = achievedCount < LEVEL_TITLES.length ? LEVEL_TITLES[achievedCount] : null;

  const [tab, setTab] = useState('dashboard');
  const [notiOn, setNotiOn] = useState(true);
  const [locationOn, setLocationOn] = useState(false);

  return (
    <Layout>
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8">
          <aside className="space-y-6">
            <section className="bg-white rounded-[2rem] border border-orange-50 shadow-sm overflow-hidden">
              <div className="h-24 bg-gradient-to-r from-orange-500 to-red-400"></div>
              <div className="px-6 pb-6 -mt-11">
                <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg overflow-hidden bg-[#f4f5f7] mx-auto flex items-center justify-center text-slate-500">
                  {profileImage ? (
                    <img src={profileImage} alt="프로필 이미지" className="w-full h-full object-cover" />
                  ) : (
                    <iconify-icon icon="lucide:user-round" class="text-4xl"></iconify-icon>
                  )}
                </div>
                <div className="text-center mt-4">
                  <h1 className="text-3xl font-extrabold text-slate-900">{nickname}</h1>
                  <p className="mt-2 text-sm font-bold text-orange-500 flex items-center justify-center gap-1">
                    <iconify-icon icon="lucide:medal"></iconify-icon>
                    {currentLevelTitle}
                  </p>
                  <p className="text-sm text-slate-500 mt-3 leading-relaxed whitespace-pre-line">{bio}</p>
                </div>
                <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                  <div><p className="text-2xl font-extrabold text-slate-900">0</p><p className="text-[11px] font-bold text-slate-400">팔로워</p></div>
                  <div><p className="text-2xl font-extrabold text-slate-900">0</p><p className="text-[11px] font-bold text-slate-400">팔로잉</p></div>
                  <div><p className="text-2xl font-extrabold text-slate-900">0</p><p className="text-[11px] font-bold text-slate-400">신뢰도</p></div>
                </div>
                <button
                  type="button"
                  className="mt-6 w-full py-4 rounded-2xl bg-slate-900 text-white font-extrabold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                  onClick={() => navigate('/profile/edit')}
                >
                  <iconify-icon icon="lucide:pencil"></iconify-icon>프로필 편집
                </button>
                <Link
                  to="/settings"
                  className="mt-3 w-full py-3 rounded-2xl border-2 border-slate-200 text-slate-700 font-extrabold text-sm flex items-center justify-center gap-2 hover:bg-slate-50"
                >
                  알림·계정 설정
                </Link>
              </div>
            </section>

            <section className="bg-white rounded-[2rem] border border-orange-50 shadow-sm p-6">
              <h2 className="text-2xl font-extrabold text-slate-900 mb-5">내 활동 통계</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-orange-50 p-4"><p className="text-sm font-bold text-orange-500">총 제보 수</p><p className="mt-3 text-3xl font-extrabold text-slate-900">{stats.reportCount}</p></div>
                <div className="rounded-2xl bg-rose-50 p-4"><p className="text-sm font-bold text-rose-500">저장한 식당</p><p className="mt-3 text-3xl font-extrabold text-slate-900">{stats.savedRestaurantCount}</p></div>
                <div className="rounded-2xl bg-indigo-50 p-4"><p className="text-sm font-bold text-indigo-500">보유 뱃지</p><p className="mt-3 text-3xl font-extrabold text-slate-900">{stats.badgeCount}</p></div>
                <div className="rounded-2xl bg-green-50 p-4"><p className="text-sm font-bold text-green-600">작성한 댓글</p><p className="mt-3 text-3xl font-extrabold text-slate-900">{stats.commentCount}</p></div>
              </div>
            </section>
          </aside>

          <section className="space-y-6">
            <div className="bg-white rounded-[2rem] border border-orange-50 shadow-sm p-2 flex items-center gap-2 overflow-x-auto">
              {[
                ['dashboard', '내 대시보드'],
                ['badge', '획득 배지'],
                ['history', '활동 이력'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`px-5 py-3 rounded-2xl text-sm font-extrabold whitespace-nowrap ${
                    tab === key ? 'bg-orange-500 text-white' : 'text-slate-600 hover:bg-orange-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === 'dashboard' && (
              <div className="space-y-6">
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-3xl font-extrabold text-slate-900">명예의 전당 배지</h2>
                    <span className="text-sm font-extrabold text-orange-500">{HALL_OF_FAME_BADGES.length}개</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                    {HALL_OF_FAME_BADGES.map((badge) => {
                      const achieved = badge.check(stats);
                      return (
                      <article key={badge.title} className={`rounded-3xl border p-5 transition-all ${achieved ? 'bg-white border-orange-100 shadow-[0_0_0_1px_rgba(251,146,60,0.15),0_10px_20px_rgba(251,146,60,0.18)]' : 'bg-slate-100/70 border-slate-200 opacity-75'}`}>
                        <div className="flex items-center gap-2">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${achieved ? badge.tone : 'bg-slate-200 text-slate-400'}`}>
                            <iconify-icon icon={badge.icon} class="text-2xl"></iconify-icon>
                          </div>
                        </div>
                        <h3 className="mt-4 text-lg font-extrabold text-slate-900">{badge.title}</h3>
                        <p className="text-xs text-slate-500 mt-1 font-bold">{badge.desc}</p>
                      </article>
                      );
                    })}
                  </div>
                </section>
                <section>
                  <h2 className="text-3xl font-extrabold text-slate-900 mb-4">개인정보 및 설정</h2>
                  <div className="bg-white rounded-3xl border border-orange-100 overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                      <p className="font-extrabold text-slate-900">푸시 알림 설정</p>
                      <button type="button" onClick={() => setNotiOn((v) => !v)} className={`relative w-12 h-7 rounded-full ${notiOn ? 'bg-orange-500' : 'bg-slate-200'}`}>
                        <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${notiOn ? 'right-1' : 'left-1'}`}></span>
                      </button>
                    </div>
                    <div className="p-5 flex items-center justify-between">
                      <p className="font-extrabold text-slate-900">위치 정보 공유</p>
                      <button type="button" onClick={() => setLocationOn((v) => !v)} className={`relative w-12 h-7 rounded-full ${locationOn ? 'bg-orange-500' : 'bg-slate-200'}`}>
                        <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${locationOn ? 'right-1' : 'left-1'}`}></span>
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {tab === 'badge' && (
              <section className="bg-white rounded-3xl border border-orange-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-3xl font-extrabold text-slate-900">획득 배지</h2>
                  <span className="text-sm font-extrabold text-orange-500">{achievedCount} / {HALL_OF_FAME_BADGES.length}</span>
                </div>
                <div className="h-px bg-slate-200 my-4"></div>
                <p className="text-sm font-extrabold text-slate-700 mb-4">
                  현재 별명: <span className="text-orange-600">{currentLevelTitle}</span>
                </p>
                <div className="mb-6 rounded-2xl border border-orange-100 bg-orange-50/40 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-extrabold text-slate-600">별명 성장 게이지</p>
                    <p className="text-xs font-extrabold text-orange-600">{achievedCount}개 획득</p>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-400 to-red-500 transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                  <p className="mt-2 text-xs font-bold text-slate-500">
                    {nextTitle
                      ? `다음 별명: ${nextTitle} (${achievedCount + 1}개 획득 시)`
                      : '축하합니다! 모든 별명 단계를 달성했습니다.'}
                  </p>
                </div>
                <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-extrabold text-slate-800 mb-3">등급별 별명 한눈에 보기</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                    {LEVEL_TITLES.map((title, idx) => {
                      const level = idx + 1;
                      const active = achievedCount >= level;
                      return (
                        <div
                          key={title}
                          className={`rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                            active
                              ? 'border-orange-200 bg-orange-50 text-orange-700'
                              : 'border-slate-200 bg-slate-50 text-slate-500'
                          }`}
                        >
                          {title}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {HALL_OF_FAME_BADGES.map((badge) => {
                    const achieved = badge.check(stats);
                    return (
                      <article key={badge.title} className={`rounded-2xl border p-4 transition-all ${achieved ? 'border-orange-100 bg-orange-50/40 shadow-[0_8px_16px_rgba(251,146,60,0.15)]' : 'border-slate-200 bg-slate-100/60 opacity-75'}`}>
                        <div className="flex items-center justify-between">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${achieved ? badge.tone : 'bg-slate-200 text-slate-400'}`}>
                            <iconify-icon icon={badge.icon} class="text-xl"></iconify-icon>
                          </div>
                        </div>
                        <p className="text-lg font-extrabold text-slate-900 mt-3">{badge.title}</p>
                        <p className="text-xs text-slate-500 font-bold mt-1">{badge.desc}</p>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {tab === 'history' && (
              <section className="bg-white rounded-3xl border border-orange-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-3xl font-extrabold text-slate-900">내 보물상자 & 활동</h2>
                </div>
                <div className="space-y-3">
                  {historyItems.length === 0 ? (
                    <p className="text-sm font-bold text-slate-500 py-8 text-center">아직 기록된 활동이 없습니다. 맛집 상세에서 댓글을 남겨 보세요.</p>
                  ) : null}
                  {historyItems.map((item) => (
                    <article key={`${item.type}-${item.id || item.date}`} className="rounded-2xl border border-slate-100 p-4">
                      <p className="text-xs text-slate-400 font-bold">{item.date}</p>
                      <p className="text-slate-900 font-extrabold mt-1">{item.title}</p>
                      <p className="text-sm text-slate-500 mt-1">{item.desc}</p>
                      {item.type === 'comment' && item.restaurantName ? (
                        <div className="mt-3 flex items-center gap-2">
                          <Link
                            to={`/detail?r=${encodeURIComponent(item.restaurantName)}#map-reviews`}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-extrabold hover:bg-slate-200"
                          >
                            수정하기
                          </Link>
                          <Link
                            to={`/detail?r=${encodeURIComponent(item.restaurantName)}#map-reviews`}
                            className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-extrabold hover:bg-red-100"
                          >
                            삭제하기
                          </Link>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              </section>
            )}

          </section>
        </div>
      </main>
    </Layout>
  );
}

