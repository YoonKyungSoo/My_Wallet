function clampRating(n) {
  return Math.min(5, Math.max(0, n));
}

/**
 * 댓글 목록 기반 평균 평점 계산.
 * - rating은 1~5만 유효로 취급
 * - 댓글이 없으면 fallbackRating 사용
 * @param {unknown[]} commentList
 * @param {unknown} fallbackRating
 * @returns {{ avgRating: number, reviewCount: number }}
 */
export function computeRestaurantMetrics(commentList, fallbackRating) {
  const list = Array.isArray(commentList) ? commentList : [];
  const nums = list
    .map((c) => Number(c?.rating))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 5);
  const reviewCount = list.length;

  if (nums.length > 0) {
    const v = nums.reduce((a, b) => a + b, 0) / nums.length;
    return { avgRating: Math.round(clampRating(v) * 10) / 10, reviewCount };
  }

  const base = Number(fallbackRating);
  return {
    avgRating: Number.isFinite(base) ? Math.round(clampRating(base) * 10) / 10 : 0,
    reviewCount,
  };
}

