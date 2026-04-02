/** API 베이스 URL — .env.development 의 VITE_API_BASE_URL */
export function getApiBaseUrl() {
  const base = import.meta.env.VITE_API_BASE_URL;
  return typeof base === 'string' ? base.replace(/\/$/, '') : '';
}

export function isApiConfigured() {
  return getApiBaseUrl().length > 0;
}

/**
 * @param {string} path API 경로 (예: /api/auth/login)
 * @param {RequestInit} [init]
 */
export async function apiFetch(path, init = {}) {
  const base = getApiBaseUrl();
  if (!base) {
    throw new Error('VITE_API_BASE_URL 이 설정되지 않았습니다.');
  }
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  const headers = new Headers(init.headers);
  if (init.body && typeof init.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(url, { ...init, headers });
}
