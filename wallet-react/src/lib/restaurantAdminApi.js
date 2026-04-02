import { apiFetch } from './api.js';
import { adminHeaders } from './auth.js';

function idFromApprovedId(approvedId) {
  const raw = String(approvedId || '');
  if (!raw.startsWith('db-')) return null;
  const n = Number(raw.slice(3));
  return Number.isFinite(n) ? n : null;
}

export async function updateRestaurantOnServer(approvedId, patch) {
  const id = idFromApprovedId(approvedId);
  if (!id) return { ok: false, reason: 'DB 식당 ID가 올바르지 않습니다.' };
  const res = await apiFetch(`/api/admin/restaurants/${id}`, {
    method: 'PATCH',
    headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) return { ok: false, reason: (await res.text()) || '수정에 실패했습니다.' };
  return { ok: true };
}

export async function deleteRestaurantOnServer(approvedId) {
  const id = idFromApprovedId(approvedId);
  if (!id) return { ok: false, reason: 'DB 식당 ID가 올바르지 않습니다.' };
  const res = await apiFetch(`/api/admin/restaurants/${id}`, {
    method: 'DELETE',
    headers: adminHeaders(),
  });
  if (!res.ok) return { ok: false, reason: (await res.text()) || '삭제에 실패했습니다.' };
  return { ok: true };
}

