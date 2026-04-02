const KEY = 'wallet_main_map_view';

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 };
const DEFAULT_LEVEL = 4;

function clampLevel(n) {
  if (!Number.isFinite(n)) return DEFAULT_LEVEL;
  return Math.min(14, Math.max(1, Math.round(n)));
}

export function loadMainMapView() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const lat = Number(parsed.lat);
    const lng = Number(parsed.lng);
    const level = clampLevel(Number(parsed.level));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < 33 || lat > 39 || lng < 124 || lng > 132) return null;
    return { lat, lng, level };
  } catch {
    return null;
  }
}

export function saveMainMapView(lat, lng, level) {
  try {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    localStorage.setItem(
      KEY,
      JSON.stringify({
        lat,
        lng,
        level: clampLevel(level),
      }),
    );
  } catch {
    /* ignore quota / private mode */
  }
}

/** 카카오 Map 인스턴스가 있을 때만 저장 (상세 이동·언마운트 직전에 호출) */
export function persistMainMapViewFromMap(map) {
  if (!map || typeof map.getCenter !== 'function' || typeof map.getLevel !== 'function') return;
  try {
    const c = map.getCenter();
    saveMainMapView(c.getLat(), c.getLng(), map.getLevel());
  } catch {
    /* ignore */
  }
}

export { DEFAULT_CENTER, DEFAULT_LEVEL };
