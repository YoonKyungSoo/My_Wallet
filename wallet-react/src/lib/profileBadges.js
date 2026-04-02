/**
 * 프로필·댓글 배지 기준 (ProfilePage 명예의 전당과 동일)
 */
export const LEVEL_TITLES = [
  '지갑 입문자',
  '한끼 탐험가',
  '가성비 수습생',
  '동네 제보러',
  '맛집 발굴단',
  '리뷰 훈련병',
  '사진 기록가',
  '지갑 수호대',
  '가성비 마스터',
  '전설의 지갑왕',
];

/** 달성 배지 개수 기준 등급 별명 (프로필 사이드바와 동일) */
export function levelTitleFromStats(stats) {
  if (!stats) return '등급 미달성';
  const achieved = BADGE_DEFINITIONS.filter((b) => b.check(stats));
  const achievedCount = achieved.length;
  if (achievedCount <= 0) return '등급 미달성';
  return LEVEL_TITLES[Math.max(0, Math.min(LEVEL_TITLES.length - 1, achievedCount - 1))];
}

export const BADGE_DEFINITIONS = [
  { level: 1, title: '첫 제보 완료', check: (s) => s.reportCount >= 1 },
  { level: 2, title: '포토 스포터', check: (s) => s.photoReportCount >= 1 },
  { level: 3, title: '동네 개척자', check: (s) => s.reportCount >= 5 },
  { level: 4, title: '댓글쌔싹', check: (s) => s.commentCount >= 10 },
  { level: 5, title: '가게 발굴왕', check: (s) => s.reportCount >= 20 },
  { level: 6, title: '댓글 장인', check: (s) => s.commentCount >= 100 },
  { level: 7, title: '별점 큐레이터', check: (s) => s.ratingCount >= 50 },
  { level: 8, title: '저장 콜렉터', check: (s) => s.savedRestaurantCount >= 30 },
  { level: 9, title: '꾸준한 탐험가', check: (s) => s.streakDays >= 7 },
  {
    level: 10,
    title: '신뢰의 아이콘',
    check: (s) => s.commentCount >= 100 && s.reportCount >= 100,
  },
];

/** 달성한 배지 중 가장 높은 단계 하나의 표시용 제목 */
export function topBadgeTitleFromStats(stats) {
  if (!stats) return '';
  const achieved = BADGE_DEFINITIONS.filter((b) => b.check(stats));
  if (!achieved.length) return '';
  achieved.sort((a, b) => b.level - a.level);
  return achieved[0].title;
}
