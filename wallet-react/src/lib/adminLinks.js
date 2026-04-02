import { getRestaurantByName } from '../data/mainRestaurants';

export function detailUrlForRestaurant(name) {
  const n = name?.trim();
  if (!n) return '/';
  return `/detail?r=${encodeURIComponent(n)}`;
}

/** 상세 페이지 방문자 리뷰 섹션 */
export function detailReviewsUrl(name) {
  return `${detailUrlForRestaurant(name)}#map-reviews`;
}

/** 특정 댓글 앵커(있으면 id, 없으면 구간만) */
export function detailCommentAnchorUrl(name, commentId, commentIndex) {
  const base = detailUrlForRestaurant(name);
  if (commentId) return `${base}#map-comment-${commentId}`;
  if (commentIndex != null && commentIndex >= 0) return `${base}?ci=${commentIndex}#map-reviews`;
  return detailReviewsUrl(name);
}

export function kakaoMapSearchUrl(query) {
  const q = query?.trim();
  if (!q) return 'https://map.kakao.com/';
  return `https://map.kakao.com/link/search/${encodeURIComponent(q)}`;
}

export function isRestaurantOnMap(name) {
  return Boolean(name?.trim() && getRestaurantByName(name.trim()));
}
