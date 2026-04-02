import Layout from '../components/Layout';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import ImageWithFallback from '../components/ImageWithFallback';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { detailPathForRestaurant, getAllRestaurants } from '../data/mainRestaurants';
import { RESTAURANTS_CHANGED } from '../lib/approvedRestaurants';
import { isApiConfigured } from '../lib/api';
import { AUTH_CHANGED } from '../lib/auth';
import { BOOKMARKS_CHANGED, loadBookmarksFromApi } from '../lib/bookmarks';
import { fetchMapCommentsForRestaurant, getMapCommentsForRestaurant } from '../lib/mapComments';
import { MAP_COMMENTS_CHANGED } from '../lib/mapComments';
import { fetchRestaurantsFromApi } from '../lib/restaurantApi';
import { mergeRestaurantGalleryPhotos } from '../lib/restaurantGallery';
import { isRestaurantBookmarked, toggleRestaurantBookmark } from '../lib/bookmarks';
import { KAKAO_MAP_KEY, loadKakaoMapScript } from '../lib/kakaoMapLoader';
import {
  DEFAULT_CENTER,
  DEFAULT_LEVEL,
  loadMainMapView,
  persistMainMapViewFromMap,
  saveMainMapView,
} from '../lib/mainMapView';
import { fetchSiteNoticeFromApi, getActiveNoticeText, SITE_NOTICE_CHANGED } from '../lib/siteNotice';
import { computeRestaurantMetrics } from '../lib/restaurantMetrics';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
const MAIN_CATEGORIES = [
  '전체',
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
const KRW = new Intl.NumberFormat('ko-KR');

const formatWon = (n) => `${KRW.format(Math.max(0, Math.round(n)))}원`;
const averagePrice = (menuPrices = []) => {
  if (!menuPrices.length) return 0;
  return Math.round(menuPrices.reduce((a, b) => a + b, 0) / menuPrices.length);
};
const averagePriceRange = (menuPrices = []) => {
  if (!menuPrices.length) return '정보 없음';
  const low = Math.min(...menuPrices);
  const high = Math.max(...menuPrices);
  if (low === high) return formatWon(low);
  return `${formatWon(low)}~${formatWon(high)}`;
};

/** 레벨↓ = 확대. 이 값 이하에서는 가격 말풍선만 쓰고 핀·클러스터는 사용하지 않음 */
const PRICE_OVERLAY_MAX_LEVEL = 6;

export default function MainPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mapStatus, setMapStatus] = useState(KAKAO_MAP_KEY ? 'loading' : 'missing-key');
  const [activeCategory, setActiveCategory] = useState('전체');
  const [activePriceCategory, setActivePriceCategory] = useState('전체');
  const [categoryExpanded, setCategoryExpanded] = useState(false);
  /** true면 음식·가격 카테고리 패널 모두 숨김(필터 버튼만 표시) */
  const [categoryFullyCollapsed, setCategoryFullyCollapsed] = useState(false);
  const [activeSort, setActiveSort] = useState('평점순');
  const [clusterCount] = useState(0);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [mapBounds, setMapBounds] = useState(null);
  const [resolvedPositions, setResolvedPositions] = useState({});
  /** 줌 레벨 (가격 오버레이 ↔ 클러스터 전환). 카테고리만 바꿀 때가 아니라 축소/확대에도 동기화 */
  const [mapLevel, setMapLevel] = useState(() => loadMainMapView()?.level ?? DEFAULT_LEVEL);
  const [restaurantListVersion, setRestaurantListVersion] = useState(0);
  /** API 모드: 카테고리 필터에 맞는 식당별 서버 댓글 목록(지도 카드 리뷰 수·썸네일용) */
  const [apiCommentsByRestaurant, setApiCommentsByRestaurant] = useState({});
  const [apiCommentsLoading, setApiCommentsLoading] = useState(false);
  const [siteNoticeText, setSiteNoticeText] = useState(() => getActiveNoticeText());
  const mapRef = useRef(null);
  const myMarkerRef = useRef(null);
  const marketPositionRef = useRef(null);
  const placesServiceRef = useRef(null);
  const searchMarkersRef = useRef([]);
  const clustererRef = useRef(null);
  const mapMarkersRef = useRef([]);
  const priceOverlaysRef = useRef([]);
  const detailOverlayRef = useRef(null);
  const openDetailOverlayByCardRef = useRef(null);

  const clearSearchMarkers = () => {
    searchMarkersRef.current.forEach((marker) => marker.setMap(null));
    searchMarkersRef.current = [];
  };

  const clearPriceOverlays = () => {
    priceOverlaysRef.current.forEach((overlay) => overlay.setMap(null));
    priceOverlaysRef.current = [];
  };

  const closeDetailOverlay = () => {
    if (!detailOverlayRef.current) return;
    detailOverlayRef.current.setMap(null);
    detailOverlayRef.current = null;
  };

  useEffect(() => {
    const focus = searchParams.get('focus');
    if (focus !== 'market-noodle') return;
    const map = mapRef.current;
    const position = marketPositionRef.current;
    if (!map || !position) return;
    map.panTo(position);
  }, [searchParams]);

  useEffect(() => {
    const bump = () => setRestaurantListVersion((v) => v + 1);
    window.addEventListener(RESTAURANTS_CHANGED, bump);
    window.addEventListener(MAP_COMMENTS_CHANGED, bump);
    return () => {
      window.removeEventListener(RESTAURANTS_CHANGED, bump);
      window.removeEventListener(MAP_COMMENTS_CHANGED, bump);
    };
  }, []);

  useEffect(() => {
    if (!isApiConfigured()) return undefined;
    let cancelled = false;
    (async () => {
      await fetchRestaurantsFromApi();
      await fetchSiteNoticeFromApi();
      await loadBookmarksFromApi();
      if (!cancelled) {
        setSiteNoticeText(getActiveNoticeText());
        setRestaurantListVersion((v) => v + 1);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isApiConfigured()) return undefined;
    const onAuth = () => {
      void loadBookmarksFromApi().then(() => setRestaurantListVersion((v) => v + 1));
    };
    window.addEventListener(AUTH_CHANGED, onAuth);
    return () => window.removeEventListener(AUTH_CHANGED, onAuth);
  }, []);

  useEffect(() => {
    if (!isApiConfigured()) return undefined;
    const onBookmarks = () => {
      void fetchRestaurantsFromApi().then(() => setRestaurantListVersion((v) => v + 1));
    };
    window.addEventListener(BOOKMARKS_CHANGED, onBookmarks);
    return () => window.removeEventListener(BOOKMARKS_CHANGED, onBookmarks);
  }, []);

  useEffect(() => {
    const syncNotice = () => setSiteNoticeText(getActiveNoticeText());
    syncNotice();
    window.addEventListener(SITE_NOTICE_CHANGED, syncNotice);
    return () => window.removeEventListener(SITE_NOTICE_CHANGED, syncNotice);
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapStatus !== 'ready' || !window.kakao?.maps?.event) return;

    const syncLevel = () => {
      setMapLevel(map.getLevel());
    };
    syncLevel();

    const listener = window.kakao.maps.event.addListener(map, 'zoom_changed', syncLevel);
    return () => {
      try {
        window.kakao.maps.event.removeListener(listener);
      } catch {
        /* ignore */
      }
    };
  }, [mapStatus]);

  /** 상세 등 다른 화면으로 나갈 때·드래그·줌 직후에도 반드시 저장 (idle만으로는 늦게 잡히는 경우 있음) */
  useEffect(() => {
    if (mapStatus !== 'ready') return undefined;
    const map = mapRef.current;
    if (!map || !window.kakao?.maps?.event) return undefined;

    const persist = () => persistMainMapViewFromMap(mapRef.current);

    let dragL;
    let zoomL;
    try {
      dragL = window.kakao.maps.event.addListener(map, 'dragend', persist);
    } catch {
      /* 일부 환경 */
    }
    try {
      zoomL = window.kakao.maps.event.addListener(map, 'zoom_changed', persist);
    } catch {
      /* ignore */
    }

    const onPageHide = () => persist();
    window.addEventListener('pagehide', onPageHide);

    return () => {
      persist();
      window.removeEventListener('pagehide', onPageHide);
      try {
        if (dragL) window.kakao.maps.event.removeListener(dragL);
      } catch {
        /* ignore */
      }
      try {
        if (zoomL) window.kakao.maps.event.removeListener(zoomL);
      } catch {
        /* ignore */
      }
    };
  }, [mapStatus]);

  useEffect(() => {
    if (!KAKAO_MAP_KEY) return;

    let cancelled = false;

    const initMap = () => {
      if (cancelled || !window.kakao?.maps) return;

      window.kakao.maps.load(() => {
        if (cancelled) return;
        const container = document.getElementById('kakao-map-main');
        if (!container) return;

        const savedView = loadMainMapView();
        const center = new window.kakao.maps.LatLng(
          savedView?.lat ?? DEFAULT_CENTER.lat,
          savedView?.lng ?? DEFAULT_CENTER.lng,
        );
        const map = new window.kakao.maps.Map(container, {
          center,
          level: savedView?.level ?? DEFAULT_LEVEL,
        });
        mapRef.current = map;
        placesServiceRef.current = new window.kakao.maps.services.Places(map);
        const clusterer = new window.kakao.maps.MarkerClusterer({
          map,
          averageCenter: true,
          minLevel: PRICE_OVERLAY_MAX_LEVEL + 1,
          disableClickZoom: true,
        });
        clustererRef.current = clusterer;
        try {
          window.kakao.maps.event.addListener(clusterer, 'clusterclick', (cl) => {
            if (!cl) return;
            try {
              const center = cl.getCenter();
              map.setLevel(PRICE_OVERLAY_MAX_LEVEL, { anchor: center, animate: true });
            } catch {
              /* ignore */
            }
          });
        } catch {
          /* 구버전 SDK 등에서 이벤트 미지원 시 무시 */
        }

        const syncBounds = () => {
          const bounds = map.getBounds();
          const sw = bounds.getSouthWest();
          const ne = bounds.getNorthEast();
          setMapBounds({
            swLat: sw.getLat(),
            swLng: sw.getLng(),
            neLat: ne.getLat(),
            neLng: ne.getLng(),
          });
          try {
            const c = map.getCenter();
            saveMainMapView(c.getLat(), c.getLng(), map.getLevel());
          } catch {
            /* ignore */
          }
        };
        window.kakao.maps.event.addListener(map, 'idle', syncBounds);
        syncBounds();
        setMapStatus('ready');
      });
    };

    const cleanupScriptEvent = loadKakaoMapScript(
      initMap,
      () => setMapStatus('script-error'),
    );
    if (window.kakao?.maps) initMap();

    return () => {
      cancelled = true;
      cleanupScriptEvent();
    };
  }, []);

  useEffect(() => {
    if (mapStatus !== 'ready' || !KAKAO_MAP_KEY) return;
    const map = mapRef.current;
    if (!map || !window.kakao?.maps) return;

    const all = getAllRestaurants();
    if (!all.length) return;

    const geocoder = new window.kakao.maps.services.Geocoder();
    let remaining = all.length;
    const nextPositions = {};

    all.forEach((restaurant) => {
      geocoder.addressSearch(restaurant.address, (result, status) => {
        if (status === window.kakao.maps.services.Status.OK && result?.length) {
          const lat = Number(result[0].y);
          const lng = Number(result[0].x);
          nextPositions[restaurant.name] = {
            lat,
            lng,
            position: new window.kakao.maps.LatLng(lat, lng),
          };
        }
        remaining -= 1;
        if (remaining === 0) {
          setResolvedPositions(nextPositions);
          const firstName = all[0]?.name;
          if (firstName && nextPositions[firstName]) {
            marketPositionRef.current = nextPositions[firstName].position;
          }
          try {
            window.kakao.maps.event.trigger(map, 'idle');
          } catch {
            /* ignore */
          }
        }
      });
    });
  }, [mapStatus, restaurantListVersion]);

  const handleLocateMe = () => {
    const map = mapRef.current;
    if (!map || !window.kakao?.maps) {
      alert('지도가 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    if (!navigator.geolocation) {
      alert('이 브라우저는 위치 정보를 지원하지 않습니다.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const current = new window.kakao.maps.LatLng(coords.latitude, coords.longitude);
        map.panTo(current);

        if (myMarkerRef.current) myMarkerRef.current.setMap(null);
        myMarkerRef.current = new window.kakao.maps.Marker({
          position: current,
          map,
          title: '내 현재 위치',
        });
      },
      () => {
        alert('위치 권한이 필요합니다. 브라우저에서 위치 접근을 허용해 주세요.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  const handleSearchKeyword = (keyword) => {
    const map = mapRef.current;
    const places = placesServiceRef.current;
    const trimmed = keyword.trim();

    if (!map || !places || !window.kakao?.maps?.services) return;
    if (!trimmed) {
      clearSearchMarkers();
      setSearchSuggestions([]);
      return;
    }

    places.keywordSearch(trimmed, (data, status) => {
      if (status !== window.kakao.maps.services.Status.OK || !data.length) {
        clearSearchMarkers();
        return;
      }

      clearSearchMarkers();
      const bounds = new window.kakao.maps.LatLngBounds();

      data.forEach((place) => {
        const position = new window.kakao.maps.LatLng(Number(place.y), Number(place.x));
        const marker = new window.kakao.maps.Marker({ position, map });
        searchMarkersRef.current.push(marker);
        bounds.extend(position);
      });

      map.setBounds(bounds);
    });
  };

  const handleSearchSuggest = (keyword) => {
    const places = placesServiceRef.current;
    const trimmed = keyword.trim();

    if (!places || !window.kakao?.maps?.services) return;
    if (!trimmed) {
      setSearchSuggestions([]);
      return;
    }

    places.keywordSearch(
      trimmed,
      (data, status) => {
        if (status !== window.kakao.maps.services.Status.OK || !data.length) {
          setSearchSuggestions([]);
          return;
        }

        const deduped = [];
        const seen = new Set();
        data.forEach((place) => {
          const key = `${place.place_name}-${place.address_name || place.road_address_name || ''}`;
          if (seen.has(key)) return;
          seen.add(key);
          deduped.push({
            name: place.place_name,
            address: place.road_address_name || place.address_name || '주소 정보 없음',
          });
        });

        setSearchSuggestions(deduped.slice(0, 6));
      },
      { size: 8 },
    );
  };

  const cards = useMemo(() => getAllRestaurants(), [restaurantListVersion]);
  const isInPriceCategory = (card, priceCategory) => {
    if (priceCategory === '전체') return true;
    const avgPriceValue = averagePrice(card.menuPrices);
    if (priceCategory === '5천원 이하') return avgPriceValue <= 5000;
    if (priceCategory === '5천원~1만원') return avgPriceValue > 5000 && avgPriceValue <= 10000;
    return avgPriceValue > 10000;
  };

  const categoryCards = useMemo(
    () => cards.filter((card) =>
      (activeCategory === '전체' || card.category === activeCategory) &&
      isInPriceCategory(card, activePriceCategory),
    ),
    [cards, activeCategory, activePriceCategory],
  );

  useEffect(() => {
    if (!isApiConfigured()) {
      setApiCommentsByRestaurant({});
      return undefined;
    }
    let cancelled = false;
    setApiCommentsLoading(true);
    const names = categoryCards.map((c) => c.name);
    const timer = setTimeout(() => {
      Promise.all(
        names.map((name) => fetchMapCommentsForRestaurant(name).then((list) => [name, list])),
      ).then((pairs) => {
        if (cancelled) return;
        const next = {};
        for (const [name, list] of pairs) next[name] = Array.isArray(list) ? list : [];
        setApiCommentsByRestaurant(next);
        setApiCommentsLoading(false);
      }).catch(() => {
        if (!cancelled) setApiCommentsLoading(false);
      });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      setApiCommentsLoading(false);
    };
  }, [categoryCards, restaurantListVersion]);

  const visibleCards = useMemo(() => {
    const filtered = categoryCards.filter((card) => {
      if (!mapBounds) return true;
      const pos = resolvedPositions[card.name];
      if (!pos) return false;
      return (
        pos.lat >= mapBounds.swLat &&
        pos.lat <= mapBounds.neLat &&
        pos.lng >= mapBounds.swLng &&
        pos.lng <= mapBounds.neLng
      );
    });

    const sorted = [...filtered];
    const commentListFor = (card) => {
      if (!card?.name) return [];
      if (isApiConfigured()) return apiCommentsByRestaurant[card.name] ?? [];
      return getMapCommentsForRestaurant(card.name) ?? [];
    };
    const reviewCountFor = (card) => computeRestaurantMetrics(commentListFor(card), card?.rating).reviewCount;
    const avgRatingFor = (card) => computeRestaurantMetrics(commentListFor(card), card?.rating).avgRating;
    if (activeSort === '평점순') {
      sorted.sort((a, b) => avgRatingFor(b) - avgRatingFor(a));
    } else if (activeSort === '리뷰순') {
      sorted.sort((a, b) => reviewCountFor(b) - reviewCountFor(a));
    } else {
      sorted.sort((a, b) => {
        const aAvg = a.menuPrices.reduce((x, y) => x + y, 0) / a.menuPrices.length;
        const bAvg = b.menuPrices.reduce((x, y) => x + y, 0) / b.menuPrices.length;
        return aAvg - bAvg;
      });
    }
    return sorted;
  }, [categoryCards, activeSort, mapBounds, resolvedPositions, apiCommentsByRestaurant]);

  const commentListForCard = useCallback(
    (card) => {
      if (!card?.name) return [];
      if (isApiConfigured()) return apiCommentsByRestaurant[card.name] ?? [];
      return getMapCommentsForRestaurant(card.name) ?? [];
    },
    [apiCommentsByRestaurant],
  );

  const reviewCountForCard = useCallback(
    (card) => computeRestaurantMetrics(commentListForCard(card), card?.rating).reviewCount,
    [commentListForCard],
  );

  const avgRatingForCard = useCallback(
    (card) => computeRestaurantMetrics(commentListForCard(card), card?.rating).avgRating,
    [commentListForCard],
  );

  const getCardPosition = (card) => {
    if (!window.kakao?.maps) return null;
    return resolvedPositions[card.name]?.position || null;
  };

  const focusRestaurantOnMap = (card) => {
    const map = mapRef.current;
    if (!map) return;
    const position = getCardPosition(card);
    if (!position) return;
    map.setLevel(3, { anchor: position, animate: true });
    map.panTo(position);
    if (openDetailOverlayByCardRef.current) {
      openDetailOverlayByCardRef.current(card, position);
    }
    document.getElementById('kakao-map-main')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  useEffect(() => {
    const map = mapRef.current;
    const clusterer = clustererRef.current;
    if (!map || !clusterer || !window.kakao?.maps) return;

    const toPosition = (card) => resolvedPositions[card.name]?.position || null;

    const level = mapLevel;
    const positions = categoryCards
      .map((card) => ({ card, position: toPosition(card) }))
      .filter((item) => item.position);

    clusterer.clear();
    mapMarkersRef.current = [];
    clearPriceOverlays();
    closeDetailOverlay();

    const openDetailOverlay = (card, position) => {
      closeDetailOverlay();
      const wrapper = document.createElement('div');
      wrapper.className = 'pointer-events-auto';
      const mapComments = isApiConfigured()
        ? apiCommentsByRestaurant[card.name] ?? []
        : getMapCommentsForRestaurant(card.name);
        const { avgRating, reviewCount } = computeRestaurantMetrics(mapComments, card?.rating);
        const visitorReviewCount = reviewCount;
        const fullStars = Math.min(5, Math.max(0, Math.round(avgRating)));
      const starsHtml = Array.from({ length: 5 }, (_, i) => {
        const on = i < fullStars;
        return `<span class="${on ? 'text-red-500' : 'text-slate-200'} text-[11px] sm:text-[13px] md:text-[15px] leading-none tracking-tight">★</span>`;
      }).join('');
      const galleryUrls = mergeRestaurantGalleryPhotos(card, mapComments);
      const thumbSrc = galleryUrls[0] || '';
      const safeThumb = thumbSrc.replace(/"/g, '');
      const thumbHtml = safeThumb
        ? `<img src="${safeThumb}" alt="" class="w-full h-full object-cover" />`
        : `<div class="w-full h-full flex items-center justify-center text-slate-300 text-2xl" aria-hidden>🍽</div>`;
      const detailPath = detailPathForRestaurant(card.name);
      const lat = position.getLat();
      const lng = position.getLng();
      const routeHref = `https://map.kakao.com/link/to/${encodeURIComponent(card.name)},${lat},${lng}`;
      const bookmarked = isRestaurantBookmarked(card.name);
      const bookmarkRing = bookmarked ? 'ring-2 ring-orange-400 bg-orange-50' : '';
      const bookmarkStar = bookmarked ? '★' : '☆';

      wrapper.innerHTML = `
        <div class="relative w-[min(80vw,260px)] sm:w-[min(88vw,300px)] md:w-[min(92vw,360px)] select-text">
          <div class="absolute -bottom-1.5 left-1/2 z-0 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-slate-200/90 bg-white md:hidden" aria-hidden></div>
          <div class="relative z-[1] overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_6px_28px_rgba(0,0,0,0.12)] md:shadow-[0_4px_24px_rgba(0,0,0,0.14)]">
            <div class="h-1 bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500"></div>
            <div class="flex items-start justify-between gap-1.5 px-2.5 pt-2 pb-1.5 border-b border-slate-100 md:gap-2 md:px-3.5 md:pt-3 md:pb-2">
              <div class="flex min-w-0 flex-1 items-center gap-1 pr-0.5">
                <h3 class="truncate text-[14px] font-extrabold leading-tight text-slate-900 sm:text-[16px] md:text-[17px]">${escapeHtml(card.name)}</h3>
                <span class="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#3182f6] text-[9px] font-bold text-white md:h-[22px] md:w-[22px] md:text-[11px]" aria-hidden>↗</span>
              </div>
              <button type="button" data-close-card class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xl font-light leading-none text-slate-400 hover:bg-slate-100 md:h-9 md:w-9 md:text-2xl" aria-label="닫기">×</button>
            </div>
            <div class="flex gap-2 px-2.5 py-2 md:gap-3 md:px-3.5 md:py-3">
              <div class="min-w-0 flex-1 space-y-0.5 md:space-y-1">
                <div class="flex flex-wrap items-center gap-x-1 gap-y-0 text-[10px] font-bold sm:text-[11px] md:text-[12px]">
                  <span class="inline-flex items-center gap-0">${starsHtml}</span>
                  <span class="font-semibold text-slate-400">리뷰 ${visitorReviewCount}</span>
                </div>
                <p class="line-clamp-2 text-[10px] font-medium leading-snug text-slate-700 sm:text-[11px] md:text-[12px]">${escapeHtml(card.address)}</p>
                <p class="text-[10px] font-extrabold text-red-600 sm:text-[11px] md:pt-0.5 md:text-[11px]">${escapeHtml(averagePriceRange(card.menuPrices))}</p>
                <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 pt-0.5 md:pt-1">
                  <a href="${detailPath}" data-detail-link="1" class="text-[11px] font-bold text-[#3182f6] hover:underline sm:text-[12px]">상세보기</a>
                </div>
              </div>
              <div class="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-100 sm:h-16 sm:w-16 md:h-[88px] md:w-[88px] md:rounded-md">${thumbHtml}</div>
            </div>
            <div class="flex items-center gap-1 border-t border-slate-100 bg-slate-50/90 px-2 py-1.5 md:gap-1 md:px-2.5 md:py-2">
              <button type="button" data-icon-action="save" class="bookmark-btn flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-base font-bold leading-none text-orange-500 hover:bg-slate-50 md:h-10 md:w-10 md:text-lg ${bookmarkRing}" title="${bookmarked ? '북마크 해제' : '북마크'}">${bookmarkStar}</button>
              <button type="button" data-icon-action="share" class="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-base text-slate-500 hover:bg-slate-50 md:h-10 md:w-10 md:text-lg" title="공유">⤴</button>
              <a href="${routeHref}" target="_blank" rel="noopener noreferrer" class="ml-auto inline-flex items-center gap-1 rounded-lg bg-[#3182f6] px-2.5 py-1.5 text-[11px] font-extrabold text-white no-underline shadow-sm hover:bg-[#256ee6] sm:gap-1.5 sm:px-3 sm:py-2 sm:text-[12px] md:px-4 md:py-2.5 md:text-[13px]">
                <span>길찾기</span>
                <span class="text-sm leading-none md:text-base">➤</span>
              </a>
            </div>
          </div>
        </div>
      `;

      wrapper.querySelector('[data-close-card]')?.addEventListener('click', () => closeDetailOverlay());
      wrapper.querySelector('[data-detail-link]')?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeDetailOverlay();
        navigate(detailPath);
      });
      wrapper.querySelector('[data-icon-action="save"]')?.addEventListener('click', () => {
        void (async () => {
          try {
            const on = await toggleRestaurantBookmark(card.name);
            const btn = wrapper.querySelector('.bookmark-btn');
            if (btn) {
              btn.title = on ? '북마크 해제' : '북마크';
              btn.textContent = on ? '★' : '☆';
              if (on) {
                btn.classList.add('ring-2', 'ring-orange-400', 'bg-orange-50');
              } else {
                btn.classList.remove('ring-2', 'ring-orange-400', 'bg-orange-50');
              }
            }
          } catch (e) {
            alert(e?.message || '북마크 처리에 실패했습니다.');
          }
        })();
      });
      wrapper.querySelector('[data-icon-action="share"]')?.addEventListener('click', () => {
        const url = `${window.location.origin}${detailPath}`;
        if (navigator.share) {
          navigator.share({ title: card.name, url }).catch(() => {});
        } else {
          navigator.clipboard?.writeText(url).then(() => alert('링크를 복사했어요.')).catch(() => {});
        }
      });

      detailOverlayRef.current = new window.kakao.maps.CustomOverlay({
        position,
        content: wrapper,
        yAnchor: 1.12,
        clickable: true,
      });
      detailOverlayRef.current.setMap(map);
    };

    openDetailOverlayByCardRef.current = openDetailOverlay;

    if (level <= PRICE_OVERLAY_MAX_LEVEL) {
      priceOverlaysRef.current = positions.map(({ card, position }) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'px-3 py-1.5 rounded-full bg-white border-2 border-emerald-400 text-slate-700 text-[11px] font-extrabold shadow-lg hover:bg-emerald-50 transition-colors';
        btn.innerHTML = `<span style="margin-right:4px;">🍜</span>${formatWon(averagePrice(card.menuPrices))}`;
        btn.addEventListener('click', () => openDetailOverlay(card, position));
        return new window.kakao.maps.CustomOverlay({ position, content: btn, yAnchor: 1.5 });
      });
      priceOverlaysRef.current.forEach((overlay) => overlay.setMap(map));
    } else {
      mapMarkersRef.current = positions.map(({ card, position }) => {
        const marker = new window.kakao.maps.Marker({
          position,
          title: card.name,
        });
        window.kakao.maps.event.addListener(marker, 'click', () => {
          map.setLevel(3, { anchor: position, animate: true });
          map.panTo(position);
          openDetailOverlay(card, position);
        });
        return marker;
      });
      clusterer.addMarkers(mapMarkersRef.current);
    }
  }, [categoryCards, mapStatus, resolvedPositions, mapLevel, apiCommentsByRestaurant, navigate]);

  return (
    <Layout
      onSearchKeyword={handleSearchKeyword}
      onSearchSuggest={handleSearchSuggest}
      searchSuggestions={searchSuggestions}
      onSelectSearchSuggestion={handleSearchKeyword}
    >
      {siteNoticeText ? (
        <div
          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-3 text-center text-sm font-bold shadow-md z-40"
          role="status"
        >
          📢 {siteNoticeText}
        </div>
      ) : null}
      <section className="relative w-full bg-[#fffbf5] overflow-hidden border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-6">
          <div className="flex flex-col rounded-2xl sm:rounded-[2rem] border border-orange-100 overflow-hidden bg-white shadow-sm">
            <div className="relative overflow-hidden h-[min(42vh,400px)] min-h-[260px] sm:min-h-[320px] sm:h-[min(50vh,480px)] md:h-[550px] md:min-h-0 w-full">
            <div id="kakao-map-main" className="absolute inset-0 z-0 bg-[#eee]" />
            {mapStatus !== 'ready' ? (
              <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                <div className="bg-white/90 border border-orange-100 rounded-2xl px-4 py-3 text-xs font-bold text-slate-600 shadow-sm">
                  {mapStatus === 'missing-key' && '카카오 지도 키가 없습니다. .env.local의 VITE_KAKAO_JS_KEY를 확인해 주세요.'}
                  {mapStatus === 'loading' && '카카오 지도 로딩 중...'}
                  {mapStatus === 'script-error' && '카카오 SDK 로드 실패: 도메인 등록(localhost) 또는 키 설정을 확인해 주세요.'}
                  {mapStatus === 'idle' && '카카오 지도 준비 중...'}
                </div>
              </div>
            ) : null}

            <div className="absolute top-2 left-2 z-30 flex max-w-[calc(100vw-1rem)] flex-col gap-1.5 sm:top-4 sm:left-4 sm:gap-3 md:top-6 md:left-6">
              <button
                type="button"
                onClick={handleLocateMe}
                className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 bg-white shadow-xl rounded-full flex items-center justify-center text-blue-500 hover:scale-110 active:scale-95 transition-all border border-slate-100 group"
                style={{ animation: 'pulse-blue 2s infinite' }}
              >
                <iconify-icon icon="lucide:locate-fixed" class="text-2xl"></iconify-icon>
              </button>
              {categoryFullyCollapsed ? (
                <button
                  type="button"
                  onClick={() => setCategoryFullyCollapsed(false)}
                  className="flex items-center gap-1 px-2 py-1.5 sm:gap-2 sm:px-3 sm:py-2.5 bg-white rounded-lg sm:rounded-2xl shadow-md sm:shadow-lg border border-orange-100/80 text-[10px] sm:text-[12px] font-extrabold text-slate-700 hover:bg-orange-50 transition-colors"
                  title="음식·가격 카테고리 열기"
                >
                  <iconify-icon icon="lucide:sliders-horizontal" class="text-sm sm:text-lg text-orange-500"></iconify-icon>
                  <span>필터</span>
                </button>
              ) : categoryExpanded ? (
                <div className="grid w-[min(200px,calc(100vw-4.5rem))] grid-cols-2 gap-1 p-1.5 sm:w-[min(216px,calc(100vw-5.5rem))] sm:gap-2 sm:p-2 bg-white rounded-xl sm:rounded-3xl shadow-lg border border-orange-100/80">
                  {MAIN_CATEGORIES.map((category) => (
                    category === '기타' ? (
                      <Fragment key="category-etc-with-collapse">
                        <button
                          type="button"
                          onClick={() => setActiveCategory(category)}
                          className={`rounded-xl px-2 py-1.5 text-[10px] font-extrabold transition-all sm:rounded-2xl sm:px-3 sm:py-2.5 sm:text-[12px] ${
                            activeCategory === category
                              ? 'bg-orange-500 text-white shadow-md'
                              : 'text-slate-600 hover:bg-white'
                          }`}
                        >
                          {category}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCategoryExpanded(false);
                            setCategoryFullyCollapsed(true);
                          }}
                          className="rounded-xl bg-slate-100 px-2 py-1.5 text-[10px] font-extrabold text-slate-500 hover:bg-slate-200 sm:rounded-2xl sm:px-3 sm:py-2 sm:text-[12px]"
                        >
                          전체 접기
                        </button>
                      </Fragment>
                    ) : (
                      <button
                        key={category}
                        type="button"
                        onClick={() => setActiveCategory(category)}
                        className={`rounded-xl px-2 py-1.5 text-[10px] font-extrabold transition-all sm:rounded-2xl sm:px-3 sm:py-2.5 sm:text-[12px] ${
                          activeCategory === category
                            ? 'bg-orange-500 text-white shadow-md'
                            : 'text-slate-600 hover:bg-white'
                        }`}
                      >
                        {category}
                      </button>
                    )
                  ))}
                  <div className="col-span-2 my-0.5 h-px bg-slate-200 sm:my-1"></div>
                  {['전체', '5천원 이하', '5천원~1만원', '1만원 초과'].map((priceCategory) => (
                    <button
                      key={priceCategory}
                      type="button"
                      onClick={() => setActivePriceCategory(priceCategory)}
                      className={`rounded-xl px-2 py-1.5 text-[9px] font-bold transition-all sm:rounded-2xl sm:px-3 sm:py-2 sm:text-[11px] ${
                        activePriceCategory === priceCategory
                          ? 'bg-emerald-500 text-white shadow-md'
                          : 'text-slate-600 hover:bg-white'
                      }`}
                    >
                      {priceCategory}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex w-fit max-w-[min(188px,calc(100vw-4.25rem))] flex-col gap-1 p-0.5 sm:max-w-[min(200px,calc(100vw-5.5rem))] sm:gap-2 sm:rounded-3xl sm:p-1 bg-white rounded-xl shadow-lg border border-orange-100/80">
                  {['전체', '한식', '양식', '카페'].map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setActiveCategory(category)}
                      className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl text-[10px] sm:text-[11px] font-bold transition-all ${
                        activeCategory === category
                          ? 'bg-orange-500 text-white shadow-md'
                          : 'text-slate-600 hover:bg-white'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCategoryExpanded(true)}
                    className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl text-[10px] sm:text-[11px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    펼치기
                  </button>
                  <div className="h-px bg-slate-200 my-0.5 sm:my-1"></div>
                  {['전체', '5천원 이하', '5천원~1만원', '1만원 초과'].map((priceCategory) => (
                    <button
                      key={priceCategory}
                      type="button"
                      onClick={() => setActivePriceCategory(priceCategory)}
                      className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl text-[10px] sm:text-[11px] font-bold transition-all ${
                        activePriceCategory === priceCategory
                          ? 'bg-emerald-500 text-white shadow-md'
                          : 'text-slate-600 hover:bg-white'
                      }`}
                    >
                      {priceCategory}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCategoryFullyCollapsed(true)}
                    className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl text-[10px] sm:text-[11px] font-extrabold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    전체 접기
                  </button>
                </div>
              )}
            </div>

            {clusterCount > 0 ? (
              <div className="absolute top-1/2 left-[48%] -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer group">
                <div className="relative flex flex-col items-center">
                  <div className="bg-green-600 text-white px-2.5 py-1 rounded-full text-[10px] font-black shadow-lg -mb-1 relative z-20 transition-transform group-hover:-translate-y-1">
                    {clusterCount}
                  </div>
                  <iconify-icon icon="mdi:map-marker" class="text-4xl text-green-600 drop-shadow-xl"></iconify-icon>
                </div>
              </div>
            ) : null}

            {/*
              TODO: 음식점 마커 클릭 시 정보 팝업으로 재활용 예정
              <div className="absolute top-[28%] left-[45%] z-40 bg-white p-4 rounded-[1.5rem] shadow-2xl border border-orange-100 flex flex-col gap-2 min-w-[180px]">
                <div className="flex justify-between items-start">
                  <h4 className="text-xs font-bold text-slate-900">식당명</h4>
                  <span className="text-[9px] font-black text-green-600 bg-green-50 px-1.5 py-0.5 rounded-lg">가성비 98</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <span className="flex items-center gap-0.5">
                    <iconify-icon icon="lucide:star" class="text-orange-400 fill-orange-400"></iconify-icon> 4.8
                  </span>
                  <span>•</span>
                  <span>350m</span>
                </div>
                <div className="w-full h-16 rounded-xl bg-slate-50 overflow-hidden mb-1">
                  <ImageWithFallback
                    src="https://images.unsplash.com/photo-1626071494702-4203bc46c841?auto=format&fit=crop&w=300&q=80"
                    className="w-full h-full object-cover"
                    alt="Preview"
                  />
                </div>
                <Link to="/detail" className="text-[11px] font-bold text-orange-600 hover:underline flex items-center justify-between">
                  상세보기 <iconify-icon icon="lucide:chevron-right"></iconify-icon>
                </Link>
              </div>
            */}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mt-4 sm:mt-6 relative z-20 pb-6 sm:pb-12 w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-5 sm:mb-8 gap-3 sm:gap-4">
          <div className="space-y-1 min-w-0">
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold mb-1 sm:mb-2">
              <iconify-icon icon="lucide:navigation"></iconify-icon>
              <span>지도 범위 내 맛집</span>
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
              지도에서 보이는 <span className="text-orange-600">가성비 맛집</span>
            </h2>
            <p className="text-slate-500 text-sm sm:text-base">
              {mapStatus === 'ready'
                ? '현재 지도 범위 내에서 가장 점수가 높은 식당들입니다.'
                : '지도가 안 뜨면 카카오 콘솔 > 플랫폼 Web에 localhost 도메인을 등록해 주세요.'}
            </p>
            {isApiConfigured() && apiCommentsLoading ? (
              <p className="text-slate-400 text-xs font-bold mt-1">리뷰/평점 집계 불러오는 중…</p>
            ) : null}
          </div>
          <div className="flex gap-1.5 sm:gap-2 p-1 bg-white shadow-sm border border-slate-100 rounded-xl sm:rounded-2xl w-full md:w-auto overflow-x-auto scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {['평점순', '최저가순', '리뷰순'].map((sort) => (
              <button
                key={sort}
                type="button"
                onClick={() => setActiveSort(sort)}
                className={`shrink-0 px-3 py-2 sm:px-4 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-colors ${
                  activeSort === sort
                    ? 'bg-orange-500 text-white'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {sort}
              </button>
            ))}
          </div>
        </div>

        {visibleCards.length === 0 ? (
          <div className="bg-white rounded-[2rem] border border-orange-100 p-10 text-center shadow-sm">
            <p className="text-lg font-extrabold text-slate-700">현재 지도에 등록된 음식점이 없습니다.</p>
            <p className="mt-2 text-sm font-bold text-slate-400">등록 후 확인해보세요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {visibleCards.map((card) => (
              <article
                key={card.name}
                role="button"
                tabIndex={0}
                onClick={() => focusRestaurantOnMap(card)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    focusRestaurantOnMap(card);
                  }
                }}
                className="group bg-white rounded-2xl sm:rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-orange-50 flex flex-col cursor-pointer"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  {card.photos.length > 0 ? (
                    <ImageWithFallback
                      src={card.photos[0]}
                      alt={`${card.name} 이미지`}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-400">
                      등록된 사진이 없습니다
                    </div>
                  )}
                  <div className="absolute top-4 left-4 flex flex-col gap-2">
                    <span className="px-3 py-1 bg-white/90 backdrop-blur rounded-full text-[10px] font-bold text-orange-600">
                      {card.category}
                    </span>
                  </div>
                </div>
                <div className="p-4 sm:p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 group-hover:text-orange-600 transition-colors min-w-0">{card.name}</h3>
                    <div className="flex items-center gap-1 text-orange-500 bg-orange-50 px-2 py-0.5 rounded-lg">
                      <iconify-icon icon="lucide:star" class="fill-orange-500"></iconify-icon>
                      <span className="font-bold text-sm">{avgRatingForCard(card).toFixed(1)}</span>
                    </div>
                  </div>
                  <p className="text-slate-400 text-xs flex items-center gap-1 mb-4">
                    <iconify-icon icon="lucide:map-pin"></iconify-icon>{card.address}
                  </p>
                  <p className="text-slate-500 text-xs font-bold mb-3">
                    리뷰 {reviewCountForCard(card)}
                  </p>
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">평균 가격대</span>
                      <span className="text-lg font-extrabold text-red-600 whitespace-nowrap">{averagePriceRange(card.menuPrices)}</span>
                    </div>
                    <Link
                      to={detailPathForRestaurant(card.name)}
                      onClick={(e) => e.stopPropagation()}
                      className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200 whitespace-nowrap"
                    >
                      상세보기
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
}

