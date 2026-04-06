import { REGISTER_MAX_PHOTOS } from './mediaLimits';
import { getMapCommentsForRestaurant } from './mapComments';

function collectCommentPhotoUrls(commentList) {
  const out = [];
  for (const c of commentList) {
    if (!Array.isArray(c.photos)) continue;
    for (const u of c.photos) {
      if (typeof u === 'string' && u) out.push(u);
    }
  }
  return out;
}

/**
 * 식당 등록 사진(최대 REGISTER_MAX_PHOTOS) + 해당 식당 리뷰 첨부 사진을 순서대로 합칩니다(중복 URL 제거).
 * @param {{ name: string, photos?: string[] }} restaurant
 * @param {unknown[]} [commentListOverride] React state 등으로 넘기면 스토리지 대신 이 목록에서 첨부 사진을 뽑습니다.
 */
export function mergeRestaurantGalleryPhotos(restaurant, commentListOverride) {
  const name = restaurant?.name;
  if (!name) return [];
  const seen = new Set();
  const out = [];
  const reg = Array.isArray(restaurant.photos)
    ? restaurant.photos.filter((u) => typeof u === 'string' && u).slice(0, REGISTER_MAX_PHOTOS)
    : [];
  for (const u of reg) {
    if (!seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  const comments = Array.isArray(commentListOverride)
    ? commentListOverride
    : getMapCommentsForRestaurant(name);
  for (const u of collectCommentPhotoUrls(comments)) {
    if (!seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  return out;
}
