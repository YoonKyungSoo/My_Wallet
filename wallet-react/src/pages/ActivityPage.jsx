import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { isApiConfigured } from '../lib/api';
import { Auth, AUTH_CHANGED } from '../lib/auth';
import {
  ACTIVITY_HISTORY_CHANGED,
  fetchActivityHistoryFromApi,
  loadActivityHistoryForUser,
} from '../lib/activityHistory';

function dotClass(type) {
  if (type === 'review') return 'bg-orange-100 border-orange-300';
  if (type === 'report') return 'bg-green-100 border-green-300';
  if (type === 'level') return 'bg-purple-100 border-purple-300';
  if (type === 'badge') return 'bg-indigo-100 border-indigo-300';
  return 'bg-slate-100 border-slate-300';
}

export default function ActivityPage() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
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

  const { timeline, stats } = useMemo(() => {
    const s = Auth.getSession();
    if (!s?.id) {
      return {
        timeline: [],
        stats: { reviewCount: 0, reportCount: 0, badgeCount: 0, levelLabel: '—' },
      };
    }
    const rows = loadActivityHistoryForUser(s.id);
    const comments = rows.filter((r) => r.type === 'comment');
    const timelineInner = rows.map((r) => {
      if (r.type === 'comment') {
        return {
          key: r.id,
          date: new Date(r.createdAt).toLocaleString('ko-KR'),
          type: 'review',
          title: `"${(r.text || '').slice(0, 120)}${(r.text || '').length > 120 ? '…' : ''}"`,
          desc: `${r.restaurantName || '식당'}에 댓글을 남겼습니다.`,
        };
      }
      return {
        key: r.id,
        date: new Date(r.createdAt).toLocaleString('ko-KR'),
        type: 'other',
        title: String(r.type || '활동'),
        desc: '',
      };
    });
    return {
      timeline: timelineInner,
      stats: {
        reviewCount: comments.length,
        reportCount: 0,
        badgeCount: 0,
        levelLabel: 'LV.—',
      },
    };
  }, [tick]);

  return (
    <Layout>
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        <section className="bg-white rounded-[2rem] border border-orange-50 p-6 md:p-8 mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900">내 보물상자 & 활동</h1>
          <p className="text-sm text-slate-500 mt-2">이 기기에 저장된 내 활동 기록입니다. (로그인 계정 기준 · 백엔드 연동 시 서버와 동기화됩니다.)</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <article className="rounded-2xl border border-orange-100 bg-orange-50 p-4 text-center">
              <p className="text-3xl font-extrabold text-slate-900">{stats.reviewCount}</p>
              <p className="text-xs font-bold text-slate-500 mt-1">작성 리뷰(댓글)</p>
            </article>
            <article className="rounded-2xl border border-green-100 bg-green-50 p-4 text-center">
              <p className="text-3xl font-extrabold text-slate-900">{stats.reportCount}</p>
              <p className="text-xs font-bold text-slate-500 mt-1">제보한 식당</p>
            </article>
            <article className="rounded-2xl border border-purple-100 bg-purple-50 p-4 text-center">
              <p className="text-3xl font-extrabold text-slate-900">{stats.badgeCount}</p>
              <p className="text-xs font-bold text-slate-500 mt-1">획득 배지</p>
            </article>
            <article className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-center">
              <p className="text-3xl font-extrabold text-slate-900">{stats.levelLabel}</p>
              <p className="text-xs font-bold text-slate-500 mt-1">현재 레벨</p>
            </article>
          </div>
        </section>

        <section className="relative pl-8">
          <div className="absolute left-2 top-0 bottom-0 w-[2px] bg-orange-100"></div>
          <div className="space-y-4">
            {timeline.length === 0 ? (
              <p className="text-sm font-bold text-slate-500 bg-white rounded-3xl border border-orange-50 p-8 text-center">
                아직 타임라인에 표시할 활동이 없습니다. 상세 페이지에서 댓글을 작성하면 여기에 쌓입니다.
              </p>
            ) : (
              timeline.map(({ key, date, type, title, desc }) => (
                <article key={key} className="relative bg-white rounded-3xl border border-orange-50 p-5">
                  <span className={`absolute -left-[38px] top-6 w-5 h-5 rounded-full border ${dotClass(type)}`}></span>
                  <p className="text-xs font-bold text-slate-400">{date}</p>
                  <p className="mt-2 text-xl font-bold text-slate-900">{title}</p>
                  {desc ? <p className="text-sm text-slate-500 mt-1">{desc}</p> : null}
                </article>
              ))
            )}
          </div>
        </section>
      </main>
    </Layout>
  );
}
