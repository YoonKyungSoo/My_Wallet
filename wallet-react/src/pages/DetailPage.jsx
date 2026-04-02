import Layout from '../components/Layout';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ImageWithFallback from '../components/ImageWithFallback';
import { apiFetch, isApiConfigured } from '../lib/api';
import { Auth, fetchMyStatsFromApi, isApiSession, loginHeaders, parseApiErrorMessage } from '../lib/auth';
import { levelTitleFromStats } from '../lib/profileBadges';
import { fileToProfileDataUrl } from '../lib/profileImage';
import { KAKAO_MAP_KEY, loadKakaoMapScript } from '../lib/kakaoMapLoader';
import { LAST_RESTAURANT_DETAIL_KEY, MAP_COMMENT_MAX_PHOTOS, REGISTER_MAX_PHOTOS } from '../lib/mediaLimits';
import { averagePriceRange, getRestaurantByName } from '../data/mainRestaurants';
import {
  deleteMapCommentById,
  fetchMapCommentsForRestaurant,
  getMapCommentsForRestaurant,
  removePhotoFromMapComment,
  setMapCommentsForRestaurant,
} from '../lib/mapComments';
import {
  RESTAURANTS_CHANGED,
  removeApprovedRestaurant,
  updateApprovedRestaurantFull,
  updateApprovedRestaurantPhotos,
} from '../lib/approvedRestaurants';
import {
  fetchHiddenPhotosForRestaurant,
  hideRestaurantDisplayPhoto,
  mergeRestaurantGalleryPhotos,
} from '../lib/restaurantGallery';
import { menuPriceTextToMenuPrices } from '../lib/pendingRestaurantSubmissions';
import { DETAIL_OVERRIDES_CHANGED, setRestaurantDetailOverride } from '../lib/restaurantDetailOverrides';
import { pushCommentReport } from '../lib/commentReports';
import { pushActivityHistory } from '../lib/activityHistory';
import { deleteRestaurantOnServer, updateRestaurantOnServer } from '../lib/restaurantAdminApi';
import { fetchRestaurantsFromApi } from '../lib/restaurantApi';

const COMMENT_IMAGE_MAX_SIDE = 480;
/** 쿼리·저장 모두 없을 때 / 잘못된 ?r= 일 때 */
const EMPTY_RESTAURANT = {
  __empty: true,
  name: '',
  category: '',
  rating: '0',
  address: '',
  recommendCount: 0,
  reviewCount: 0,
  menuPrices: [],
  photos: [],
  phone: '',
};
const GALLERY_THUMB_WINDOW = 5;

const EDIT_CATEGORIES = [
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

export default function DetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const queryName = searchParams.get('r')?.trim() || '';

  const [registryTick, setRegistryTick] = useState(0);

  useEffect(() => {
    const bump = () => setRegistryTick((t) => t + 1);
    window.addEventListener(RESTAURANTS_CHANGED, bump);
    window.addEventListener(DETAIL_OVERRIDES_CHANGED, bump);
    return () => {
      window.removeEventListener(RESTAURANTS_CHANGED, bump);
      window.removeEventListener(DETAIL_OVERRIDES_CHANGED, bump);
    };
  }, []);

  const saved = useMemo(() => {
    try {
      const raw = localStorage.getItem(LAST_RESTAURANT_DETAIL_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const restaurant = useMemo(() => {
    if (queryName) {
      const hit = getRestaurantByName(queryName);
      if (hit) return hit;
      return EMPTY_RESTAURANT;
    }
    if (saved?.restaurantName) {
      const hit = getRestaurantByName(saved.restaurantName);
      if (hit) {
        const mergedPhotos = Array.isArray(saved.photos) && saved.photos.length ? saved.photos : hit.photos;
        return { ...hit, photos: mergedPhotos };
      }
    }
    return EMPTY_RESTAURANT;
  }, [queryName, saved, registryTick]);

  const session = Auth.getSession();
  const isLoggedIn = Auth.isLoggedIn();
  const myNickname = session?.nickname || '익명';
  const [myLevelTitle, setMyLevelTitle] = useState('등급 미달성');

  useEffect(() => {
    if (!isLoggedIn) {
      setMyLevelTitle('등급 미달성');
      return;
    }
    if (!isApiConfigured() || !session?.id) {
      setMyLevelTitle('등급 미달성');
      return;
    }
    let cancelled = false;
    void fetchMyStatsFromApi().then((s) => {
      if (cancelled) return;
      if (!s) {
        setMyLevelTitle('등급 미달성');
        return;
      }
      setMyLevelTitle(
        levelTitleFromStats({
          reportCount: Number(s.reportCount || 0),
          photoReportCount: Number(s.photoReportCount || 0),
          savedRestaurantCount: Number(s.savedRestaurantCount || 0),
          commentCount: Number(s.commentCount || 0),
          ratingCount: Number(s.ratingCount || 0),
          streakDays: Number(s.streakDays || 0),
        }),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, session?.id]);

  const requireLogin = useCallback(
    (msg = '로그인이 필요합니다.') => {
      if (Auth.isLoggedIn()) return true;
      alert(msg);
      const next = `${location.pathname}${location.search}` || '/';
      navigate(`/login?next=${encodeURIComponent(next)}`);
      return false;
    },
    [navigate, location.pathname, location.search],
  );

  const title = restaurant.name;
  const address = restaurant.address;
  const categoryLabel = restaurant.category;
  const menuName = (restaurant.menuName || saved?.menuName || '').trim();
  const menuPrice = (restaurant.menuPriceLabel || saved?.menuPrice || '').trim();

  const [comments, setComments] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isApiConfigured()) {
        const list = await fetchMapCommentsForRestaurant(restaurant.name);
        if (!cancelled) setComments(Array.isArray(list) ? list : []);
        return;
      }
      const list = getMapCommentsForRestaurant(restaurant.name);
      let changed = false;
      const withIds = list.map((c, i) => {
        if (c.id) return c;
        changed = true;
        return { ...c, id: `mig-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}` };
      });
      if (changed) {
        setMapCommentsForRestaurant(restaurant.name, withIds);
        setComments(withIds);
      } else {
        setComments(list);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [restaurant.name]);

  const isAdmin = Auth.isAdmin();
  const remoteComments = isApiConfigured() && isApiSession();

  const [hiddenPhotoTick, setHiddenPhotoTick] = useState(0);
  useEffect(() => {
    const onHidden = () => setHiddenPhotoTick((t) => t + 1);
    window.addEventListener('wallet-hidden-photos-changed', onHidden);
    return () => window.removeEventListener('wallet-hidden-photos-changed', onHidden);
  }, []);

  const allGalleryPhotos = useMemo(
    () => mergeRestaurantGalleryPhotos(restaurant, comments),
    [restaurant.name, restaurant.photos, comments, hiddenPhotoTick],
  );

  const hasAnyPhoto = allGalleryPhotos.length > 0;

  const [photoIndex, setPhotoIndex] = useState(0);
  const [galleryWindowPage, setGalleryWindowPage] = useState(0);
  const photosKey = allGalleryPhotos.join('|');

  useEffect(() => {
    setPhotoIndex(0);
    setGalleryWindowPage(0);
  }, [photosKey, restaurant.name]);

  const heroSrc = allGalleryPhotos[photoIndex] || '';

  const removeHeroMainRegistrationPhoto = () => {
    if (!heroSrc || !(restaurant.photos || []).includes(heroSrc)) return;
    if (!window.confirm('이 대표(등록) 사진을 삭제할까요?')) return;
    if (restaurant.approvedId) {
      const next = (restaurant.photos || []).filter((u) => u !== heroSrc);
      if (isApiConfigured()) {
        void updateRestaurantOnServer(restaurant.approvedId, { photos: next })
          .then(async (r) => {
            if (!r.ok) return;
            await fetchRestaurantsFromApi();
            window.dispatchEvent(new Event(RESTAURANTS_CHANGED));
          });
      } else {
        updateApprovedRestaurantPhotos(restaurant.approvedId, next);
      }
    } else {
      hideRestaurantDisplayPhoto(restaurant.name, heroSrc);
    }
    setRegistryTick((t) => t + 1);
  };

  const [adminEditOpen, setAdminEditOpen] = useState(false);
  const [adminEditForm, setAdminEditForm] = useState(null);

  const openAdminDetailEdit = () => {
    const menuLine =
      Array.isArray(restaurant.menuPrices) && restaurant.menuPrices.length
        ? restaurant.menuPrices.join(', ')
        : '5000';
    setAdminEditForm({
      isApproved: Boolean(restaurant.approvedId),
      approvedId: restaurant.approvedId || '',
      name: restaurant.name || '',
      address: restaurant.address || '',
      category: EDIT_CATEGORIES.includes(restaurant.category)
        ? restaurant.category
        : restaurant.category || '기타',
      rating: String(restaurant.rating ?? '4'),
      menuPriceLine: menuLine,
      photosLines: Array.isArray(restaurant.photos) ? restaurant.photos.join('\n') : '',
      phone: restaurant.phone || '',
    });
    setAdminEditOpen(true);
  };

  const saveAdminDetailEdit = async () => {
    if (!adminEditForm) return;
    const menuPrices = menuPriceTextToMenuPrices(adminEditForm.menuPriceLine);
    const photos = adminEditForm.photosLines
      .split(/\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (adminEditForm.isApproved && adminEditForm.approvedId) {
      const patch = {
        name: adminEditForm.name.trim(),
        address: adminEditForm.address.trim(),
        category: adminEditForm.category,
        rating: adminEditForm.rating,
        menuPrices,
        photos,
        phone: adminEditForm.phone.trim(),
      };
      const res = isApiConfigured()
        ? await updateRestaurantOnServer(adminEditForm.approvedId, patch)
        : updateApprovedRestaurantFull(adminEditForm.approvedId, patch);
      if (!res.ok) {
        alert(res.reason || '저장에 실패했습니다.');
        return;
      }
      if (isApiConfigured()) {
        await fetchRestaurantsFromApi();
        window.dispatchEvent(new Event(RESTAURANTS_CHANGED));
      }
      const newName = adminEditForm.name.trim();
      setAdminEditOpen(false);
      setAdminEditForm(null);
      if (newName && newName !== restaurant.name) {
        navigate(`/detail?r=${encodeURIComponent(newName)}`, { replace: true });
      } else {
        setRegistryTick((t) => t + 1);
      }
      alert('저장되었습니다.');
      return;
    }

    setRestaurantDetailOverride(restaurant.name, {
      address: adminEditForm.address.trim(),
      category: adminEditForm.category,
      rating: adminEditForm.rating,
      menuPrices,
      photos,
      phone: adminEditForm.phone.trim(),
    });
    setAdminEditOpen(false);
    setAdminEditForm(null);
    setRegistryTick((t) => t + 1);
    alert('저장되었습니다. (이 기기에만 반영됩니다.)');
  };

  const adminDeleteApprovedRestaurant = async () => {
    if (!restaurant.approvedId) return;
    if (!window.confirm(`「${restaurant.name}」을(를) 지도·목록에서 삭제할까요? 댓글 데이터는 유지됩니다.`))
      return;
    if (isApiConfigured()) {
      const res = await deleteRestaurantOnServer(restaurant.approvedId);
      if (!res.ok) {
        alert(res.reason || '삭제에 실패했습니다.');
        return;
      }
      await fetchRestaurantsFromApi();
      window.dispatchEvent(new Event(RESTAURANTS_CHANGED));
    } else {
      removeApprovedRestaurant(restaurant.approvedId);
    }
    setAdminEditOpen(false);
    setAdminEditForm(null);
    navigate('/', { replace: true });
  };

  const showAdminMainPhotoRemove =
    isAdmin && heroSrc && (restaurant.photos || []).includes(heroSrc);

  const maxGalleryWindowPage = Math.max(0, Math.ceil(allGalleryPhotos.length / GALLERY_THUMB_WINDOW) - 1);

  useEffect(() => {
    if (!isApiConfigured()) return;
    void fetchHiddenPhotosForRestaurant(restaurant.name).then(() => setHiddenPhotoTick((t) => t + 1));
  }, [restaurant.name]);
  const galleryThumbSlice = allGalleryPhotos.slice(
    galleryWindowPage * GALLERY_THUMB_WINDOW,
    galleryWindowPage * GALLERY_THUMB_WINDOW + GALLERY_THUMB_WINDOW,
  );

  const avgRatingInfo = useMemo(() => {
    const nums = comments
      .map((c) => Number(c.rating))
      .filter((n) => !Number.isNaN(n) && n >= 1 && n <= 5);
    if (nums.length === 0) {
      const base = Number(restaurant.rating);
      return {
        value: Number.isNaN(base) ? null : Math.round(base * 10) / 10,
        sub: '플레이스 기준',
      };
    }
    const v = Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
    return { value: v, sub: `리뷰 ${nums.length}건 기준` };
  }, [comments, restaurant.rating]);

  const priceLabel = menuPrice || averagePriceRange(restaurant.menuPrices);

  useEffect(() => {
    const scrollToCommentOrReviews = () => {
      const rawHash = window.location.hash.replace(/^#/, '');
      let elId = null;
      if (rawHash.startsWith('map-comment-')) elId = rawHash;
      if (!elId) {
        const cParam = searchParams.get('c')?.trim();
        if (cParam) elId = `map-comment-${cParam}`;
      }
      if (!elId) {
        const ci = searchParams.get('ci');
        if (ci != null && comments.length) {
          const i = parseInt(ci, 10);
          if (!Number.isNaN(i) && i >= 0 && i < comments.length) {
            const c = comments[i];
            if (c?.id) elId = `map-comment-${c.id}`;
          }
        }
      }
      if (elId) {
        requestAnimationFrame(() => {
          document.getElementById(elId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        return;
      }
      if (window.location.hash === '#map-reviews') {
        document.getElementById('map-reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    const t = setTimeout(scrollToCommentOrReviews, 120);
    window.addEventListener('hashchange', scrollToCommentOrReviews);
    return () => {
      clearTimeout(t);
      window.removeEventListener('hashchange', scrollToCommentOrReviews);
    };
  }, [restaurant.name, comments, searchParams]);

  const persistComments = useCallback(
    (next) => {
      setMapCommentsForRestaurant(restaurant.name, next);
      setComments(next);
    },
    [restaurant.name],
  );

  const [draftText, setDraftText] = useState('');
  const [draftRating, setDraftRating] = useState(5);
  const [pendingPhotos, setPendingPhotos] = useState([]);

  const detailMapRef = useRef(null);
  const detailMarkerRef = useRef(null);
  const [mapDetailStatus, setMapDetailStatus] = useState(() => (KAKAO_MAP_KEY ? 'loading' : 'missing-key'));
  const [detailCoords, setDetailCoords] = useState(null);

  useEffect(() => {
    if (!KAKAO_MAP_KEY) {
      setMapDetailStatus('missing-key');
      return;
    }

    let cancelled = false;
    const addr = restaurant.address?.trim() || '';
    if (!addr) {
      setMapDetailStatus('geocode-fail');
      setDetailCoords(null);
      return;
    }

    setDetailCoords(null);
    setMapDetailStatus('loading');

    const run = () => {
      if (cancelled || !window.kakao?.maps) return;
      window.kakao.maps.load(() => {
        if (cancelled) return;
        const container = document.getElementById('kakao-map-detail');
        if (!container) return;

        const geocoder = new window.kakao.maps.services.Geocoder();
        geocoder.addressSearch(addr, (result, status) => {
          if (cancelled) return;
          if (status !== window.kakao.maps.services.Status.OK || !result?.length) {
            setMapDetailStatus('geocode-fail');
            setDetailCoords(null);
            return;
          }
          const lat = Number(result[0].y);
          const lng = Number(result[0].x);
          setDetailCoords({ lat, lng });
          const position = new window.kakao.maps.LatLng(lat, lng);

          if (detailMarkerRef.current) {
            detailMarkerRef.current.setMap(null);
            detailMarkerRef.current = null;
          }
          detailMapRef.current = null;

          container.innerHTML = '';
          const map = new window.kakao.maps.Map(container, { center: position, level: 3 });
          const marker = new window.kakao.maps.Marker({ position, map });
          detailMapRef.current = map;
          detailMarkerRef.current = marker;
          setMapDetailStatus('ready');

          requestAnimationFrame(() => {
            try {
              map.relayout();
            } catch {
              /* ignore */
            }
          });
        });
      });
    };

    const cleanupScript = loadKakaoMapScript(run, () => {
      if (!cancelled) setMapDetailStatus('error');
    });
    if (window.kakao?.maps) run();

    return () => {
      cancelled = true;
      cleanupScript?.();
      if (detailMarkerRef.current) {
        detailMarkerRef.current.setMap(null);
        detailMarkerRef.current = null;
      }
      detailMapRef.current = null;
      const el = document.getElementById('kakao-map-detail');
      if (el) el.innerHTML = '';
    };
  }, [restaurant.address, restaurant.name]);

  useEffect(() => {
    const map = detailMapRef.current;
    if (!map || mapDetailStatus !== 'ready') return;
    const el = document.getElementById('kakao-map-detail');
    if (!el) return;

    const relayout = () => {
      try {
        map.relayout();
      } catch {
        /* ignore */
      }
    };
    const ro = new ResizeObserver(() => relayout());
    ro.observe(el);
    window.addEventListener('orientationchange', relayout);
    const t = setTimeout(relayout, 200);
    return () => {
      ro.disconnect();
      window.removeEventListener('orientationchange', relayout);
      clearTimeout(t);
    };
  }, [mapDetailStatus, restaurant.name]);

  const submitComment = async () => {
    if (!requireLogin('리뷰 작성은 로그인 후 이용할 수 있습니다.')) return;
    const text = draftText.trim();
    const photosCopy = pendingPhotos.length ? [...pendingPhotos] : undefined;
    if (!text && !photosCopy?.length) return;
    if (remoteComments) {
      try {
        const res = await apiFetch('/api/map-comments', {
          method: 'POST',
          headers: { ...loginHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            restaurantName: restaurant.name,
            rating: draftRating,
            text,
            photos: photosCopy,
            levelTitle: myLevelTitle,
          }),
        });
        if (!res.ok) {
          alert((await parseApiErrorMessage(res)) || '리뷰 등록에 실패했습니다.');
          return;
        }
        const row = await res.json();
        setComments((prev) => [...prev, row]);
        // API 모드: 활동 로그·리뷰수·뱃지는 서버에서 처리 (중복 이벤트 방지)
        setDraftText('');
        setPendingPhotos([]);
      } catch (e) {
        alert(e?.message || '리뷰 등록에 실패했습니다.');
      }
      return;
    }
    const prev = getMapCommentsForRestaurant(restaurant.name);
    const cid =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const next = [
      ...prev,
      {
        id: cid,
        nickname: myNickname,
        levelTitle: myLevelTitle,
        rating: draftRating,
        text,
        photos: photosCopy,
      },
    ];
    persistComments(next);
    const historyText = text || (photosCopy?.length ? `사진 ${photosCopy.length}장` : '');
    pushActivityHistory({
      type: 'comment',
      restaurantName: restaurant.name,
      text: historyText,
      rating: draftRating,
      nickname: myNickname,
      levelTitle: myLevelTitle,
      photoCount: photosCopy?.length || 0,
    });
    setDraftText('');
    setPendingPhotos([]);
  };

  const removePendingPhoto = (idx) => {
    setPendingPhotos((p) => p.filter((_, i) => i !== idx));
  };

  const onPickPhotos = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    const next = [...pendingPhotos];
    for (const file of files) {
      if (next.length >= MAP_COMMENT_MAX_PHOTOS) break;
      try {
        const url = await fileToProfileDataUrl(file, COMMENT_IMAGE_MAX_SIDE, 0.82);
        next.push(url);
      } catch {
        alert('이미지를 불러오지 못했습니다. 다른 파일로 시도해 주세요.');
      }
    }
    setPendingPhotos(next);
  };

  const openImageTab = (src, docTitle) => {
    const w = window.open('');
    if (w) {
      w.document.write(
        `<title>${docTitle}</title><body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="${src.replace(/"/g, '')}" style="max-width:100%;max-height:100vh;object-fit:contain" alt="" /></body>`,
      );
      w.document.close();
    }
  };

  if (restaurant.__empty) {
    return (
      <Layout>
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 text-center">
          <p className="text-lg font-extrabold text-slate-900">식당 정보가 없습니다</p>
          <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
            메인에서 식당을 선택하거나, 제보·승인 후 등록된 식당만 볼 수 있습니다.
          </p>
          <Link
            to="/"
            className="inline-block mt-8 px-6 py-3 rounded-2xl bg-orange-500 text-white font-extrabold hover:bg-orange-600"
          >
            메인으로
          </Link>
        </main>
      </Layout>
    );
  }

  return (
    <Layout>
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        <div className="flex flex-col lg:flex-row gap-8 lg:items-start">
          <div className="flex-1 min-w-0 flex flex-col gap-8">
            <section id="detail-hero-top" className="relative h-[300px] md:h-[450px] w-full rounded-[2.5rem] overflow-hidden shadow-xl shadow-orange-100 bg-slate-100 scroll-mt-24">
              {hasAnyPhoto ? (
                <>
                  <ImageWithFallback src={heroSrc} alt={`${title} 사진 ${photoIndex + 1}`} className="w-full h-full object-cover" />
                  {allGalleryPhotos.length > 1 ? (
                    <>
                      <button
                        type="button"
                        aria-label="이전 사진"
                        className="absolute left-3 top-1/2 z-20 -translate-y-1/2 w-11 h-11 rounded-full bg-black/45 text-white text-2xl font-bold leading-none flex items-center justify-center hover:bg-black/60 shadow-lg backdrop-blur-sm"
                        onClick={() =>
                          setPhotoIndex((i) => (i - 1 + allGalleryPhotos.length) % allGalleryPhotos.length)
                        }
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        aria-label="다음 사진"
                        className="absolute right-3 top-1/2 z-20 -translate-y-1/2 w-11 h-11 rounded-full bg-black/45 text-white text-2xl font-bold leading-none flex items-center justify-center hover:bg-black/60 shadow-lg backdrop-blur-sm"
                        onClick={() => setPhotoIndex((i) => (i + 1) % allGalleryPhotos.length)}
                      >
                        ›
                      </button>
                      <div className="absolute top-4 left-1/2 z-20 -translate-x-1/2 px-3 py-1 rounded-full bg-black/40 text-white text-xs font-extrabold backdrop-blur-sm">
                        {photoIndex + 1} / {allGalleryPhotos.length}
                      </div>
                    </>
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent flex flex-col justify-end p-8 md:p-12 pointer-events-none">
                    <div className="flex flex-wrap gap-3 mb-4 pointer-events-auto">
                      <span className="px-4 py-1.5 bg-white/20 backdrop-blur-md text-white rounded-full text-xs font-bold border border-white/30">{categoryLabel}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 gap-y-2 pointer-events-auto relative z-30">
                      <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-sm">{title}</h1>
                      {showAdminMainPhotoRemove ? (
                        <button
                          type="button"
                          onClick={removeHeroMainRegistrationPhoto}
                          className="px-3 py-1.5 rounded-xl bg-red-500/95 text-white text-xs font-extrabold hover:bg-red-600 border border-white/40 shadow-md"
                        >
                          대표(등록) 사진 삭제
                        </button>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 mt-4 text-white/95 pointer-events-auto">
                      <div className="flex items-center gap-1.5">
                        <iconify-icon icon="lucide:star" class="text-orange-400"></iconify-icon>
                        <span className="font-bold">{avgRatingInfo.value != null ? avgRatingInfo.value : '-'}</span>
                        <span className="text-white/70 text-sm font-semibold">({avgRatingInfo.sub})</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm">
                        <iconify-icon icon="lucide:map-pin"></iconify-icon>
                        <span>{address}</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col">
                  <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                    <iconify-icon icon="lucide:image-off" class="text-5xl text-slate-300 mb-3"></iconify-icon>
                    <p className="text-slate-500 font-extrabold">등록된 사진이 없습니다</p>
                    <p className="text-slate-400 text-sm font-bold mt-1">제보·리뷰로 사진을 올리면 여기에 표시돼요</p>
                  </div>
                  <div className="p-8 md:p-12 bg-gradient-to-t from-black/80 to-transparent">
                    <span className="inline-block px-4 py-1.5 bg-white/15 backdrop-blur-md text-white rounded-full text-xs font-bold border border-white/25 mb-4">{categoryLabel}</span>
                    <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">{title}</h1>
                    <div className="flex flex-wrap items-center gap-4 mt-4 text-white/90 text-sm">
                      <div className="flex items-center gap-1.5">
                        <iconify-icon icon="lucide:star" class="text-orange-400"></iconify-icon>
                        <span className="font-bold">{avgRatingInfo.value != null ? avgRatingInfo.value : '-'}</span>
                        <span className="text-white/70">({avgRatingInfo.sub})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <iconify-icon icon="lucide:map-pin"></iconify-icon>
                        <span>{address}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {allGalleryPhotos.length > 1 ? (
              <section className="bg-white rounded-[2rem] p-6 md:p-8 border border-orange-50 shadow-sm">
                <h2 className="text-xl font-extrabold text-slate-900 mb-1">
                  사진 <span className="text-orange-600">({allGalleryPhotos.length}장)</span>
                </h2>
                <p className="text-xs font-bold text-slate-400 mb-4">
                  식당 등록 시 올린 사진(최대 {REGISTER_MAX_PHOTOS}장)과 리뷰에 첨부한 사진이 함께 보여요.
                  {allGalleryPhotos.length > GALLERY_THUMB_WINDOW
                    ? ` 아래는 한 번에 ${GALLERY_THUMB_WINDOW}장씩, 화살표로 더 볼 수 있어요.`
                    : ''}
                </p>
                <div className="flex items-stretch gap-2">
                  {allGalleryPhotos.length > GALLERY_THUMB_WINDOW ? (
                    <button
                      type="button"
                      aria-label="이전 사진 목록"
                      disabled={galleryWindowPage <= 0}
                      className="shrink-0 w-10 rounded-xl border border-slate-200 bg-slate-50 text-lg font-bold text-slate-600 hover:bg-orange-50 hover:border-orange-200 disabled:opacity-30 disabled:pointer-events-none"
                      onClick={() => setGalleryWindowPage((p) => Math.max(0, p - 1))}
                    >
                      ‹
                    </button>
                  ) : null}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 flex-1 min-w-0">
                    {galleryThumbSlice.map((src, i) => {
                      const globalIdx = galleryWindowPage * GALLERY_THUMB_WINDOW + i;
                      return (
                        <button
                          key={`gallery-thumb-${globalIdx}`}
                          type="button"
                          className={`relative aspect-square rounded-2xl overflow-hidden border shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                            globalIdx === photoIndex ? 'ring-2 ring-orange-400 border-orange-300' : 'border-orange-100'
                          }`}
                          onClick={() => {
                            setPhotoIndex(globalIdx);
                            document.getElementById('detail-hero-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }}
                        >
                          <img src={src} alt="" className="w-full h-full object-cover" />
                        </button>
                      );
                    })}
                  </div>
                  {allGalleryPhotos.length > GALLERY_THUMB_WINDOW ? (
                    <button
                      type="button"
                      aria-label="다음 사진 목록"
                      disabled={galleryWindowPage >= maxGalleryWindowPage}
                      className="shrink-0 w-10 rounded-xl border border-slate-200 bg-slate-50 text-lg font-bold text-slate-600 hover:bg-orange-50 hover:border-orange-200 disabled:opacity-30 disabled:pointer-events-none"
                      onClick={() => setGalleryWindowPage((p) => Math.min(maxGalleryWindowPage, p + 1))}
                    >
                      ›
                    </button>
                  ) : null}
                </div>
              </section>
            ) : null}

            <section className="bg-white rounded-[2rem] p-8 border border-orange-50 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">상세 정보</h2>
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-bold text-slate-400">주소</p>
                  <div className="mt-2 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <p className="text-slate-800 font-semibold leading-relaxed flex-1 min-w-0">{address}</p>
                    {detailCoords ? (
                      <a
                        href={`https://map.kakao.com/link/to/${encodeURIComponent(title)},${detailCoords.lat},${detailCoords.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#3182f6] text-white text-sm font-extrabold hover:bg-[#256ee6] shadow-sm whitespace-nowrap"
                      >
                        길찾기
                        <span className="text-base leading-none">➤</span>
                      </a>
                    ) : (
                      <span className="text-xs font-bold text-slate-400 shrink-0">지도 로딩 후 길찾기를 쓸 수 있어요</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-10 gap-y-4">
                  <div>
                    <p className="text-xs font-bold text-slate-400">평균 가격대</p>
                    <p className="text-red-600 font-extrabold text-xl mt-1">{priceLabel}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400">평균 평점</p>
                    <p className="text-slate-900 font-extrabold text-xl mt-1 flex items-baseline gap-2">
                      {avgRatingInfo.value != null ? avgRatingInfo.value : '-'}
                      <span className="text-sm font-bold text-slate-400">{avgRatingInfo.sub}</span>
                    </p>
                  </div>
                </div>
                {menuName ? (
                  <div>
                    <p className="text-xs font-bold text-slate-400">제보 메뉴</p>
                    <p className="text-slate-700 font-semibold mt-1">{menuName}</p>
                  </div>
                ) : null}
              </div>

              {isAdmin ? (
                <div className="mt-6 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={openAdminDetailEdit}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-extrabold hover:bg-emerald-700"
                  >
                    상세 정보 변경
                  </button>
                  {restaurant.approvedId ? (
                    <button
                      type="button"
                      onClick={adminDeleteApprovedRestaurant}
                      className="px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-extrabold hover:bg-red-700"
                    >
                      식당 삭제
                    </button>
                  ) : (
                    <p className="text-xs font-bold text-slate-400 self-center max-w-[220px] leading-snug">
                      관리자 승인으로 등록된 식당만 여기서 삭제할 수 있습니다.
                    </p>
                  )}
                </div>
              ) : null}

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  className="flex-1 py-4 bg-orange-500 text-white rounded-2xl font-extrabold text-center hover:bg-orange-600 transition-colors"
                  onClick={() => {
                    const bugPath = `/review?type=bug&r=${encodeURIComponent(title)}`;
                    if (!Auth.isLoggedIn()) {
                      alert('버그 제보는 로그인 후 이용할 수 있습니다.');
                      navigate(`/login?next=${encodeURIComponent(bugPath)}`);
                      return;
                    }
                    navigate(bugPath);
                  }}
                >
                  버그 제보
                </button>
                <button
                  type="button"
                  className="flex-1 py-4 bg-white border-2 border-slate-900 text-slate-900 rounded-2xl font-extrabold hover:bg-slate-900 hover:text-white transition-colors"
                  onClick={() => alert('내 지갑에 저장되었습니다!')}
                >
                  내 지갑에 저장하기
                </button>
              </div>
            </section>

            <section id="map-reviews" className="space-y-6 pb-12 scroll-mt-24">
              <h2 className="text-2xl font-bold text-slate-900">
                방문자 리뷰 <span className="text-orange-600 font-extrabold">{comments.length}</span>
              </h2>

              <div className="bg-white rounded-[2rem] border border-orange-100 p-5 md:p-6 shadow-sm space-y-4">
                <p className="text-sm font-extrabold text-slate-700">리뷰 작성</p>
                {!isLoggedIn ? (
                  <div className="rounded-2xl border border-orange-100 bg-orange-50/60 p-5 text-center space-y-3">
                    <p className="text-sm font-bold text-slate-700">리뷰·사진 첨부는 로그인 후 이용할 수 있습니다.</p>
                    <button
                      type="button"
                      className="px-5 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-extrabold hover:bg-orange-600"
                      onClick={() => {
                        const next = `${location.pathname}${location.search}` || '/';
                        navigate(`/login?next=${encodeURIComponent(next)}`);
                      }}
                    >
                      로그인하기
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2 items-center">
                      <select
                        value={draftRating}
                        onChange={(e) => setDraftRating(Number(e.target.value))}
                        className="px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-700"
                      >
                        {[5, 4, 3, 2, 1].map((n) => (
                          <option key={n} value={n}>⭐ {n}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={draftText}
                        onChange={(e) => setDraftText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.isComposing) {
                            e.preventDefault();
                            submitComment();
                          }
                        }}
                        placeholder="댓글을 입력하세요 · Enter로 등록"
                        className="flex-1 min-w-[160px] px-3 py-2 rounded-xl border border-slate-200 text-sm"
                      />
                      <button
                        type="button"
                        onClick={submitComment}
                        className="px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-extrabold hover:bg-orange-600"
                      >
                        등록
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="cursor-pointer px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-extrabold text-slate-600 hover:bg-slate-100">
                        사진 첨부 (최대 {MAP_COMMENT_MAX_PHOTOS}장)
                        <input type="file" accept="image/*" multiple className="hidden" onChange={onPickPhotos} />
                      </label>
                      {pendingPhotos.length > 0 ? (
                        <span className="text-xs font-bold text-slate-400">{pendingPhotos.length}/{MAP_COMMENT_MAX_PHOTOS}</span>
                      ) : null}
                      {pendingPhotos.length > 0 ? (
                        <button type="button" className="text-xs font-extrabold text-orange-600 hover:underline" onClick={() => setPendingPhotos([])}>
                          사진 비우기
                        </button>
                      ) : null}
                    </div>
                    {pendingPhotos.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {pendingPhotos.map((src, i) => (
                          <span key={i} className="relative inline-block">
                            <img src={src} alt="" className="h-14 w-14 object-cover rounded-xl border border-orange-100" />
                            <button
                              type="button"
                              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full font-bold"
                              onClick={() => removePendingPhoto(i)}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </>
                )}
              </div>

              <div className="flex flex-col gap-4">
                {comments.length === 0 ? (
                  <p className="text-sm font-bold text-slate-400">아직 리뷰가 없어요. 첫 리뷰를 남겨 보세요!</p>
                ) : (
                  comments.map((c, idx) => {
                    const isMine = isLoggedIn && c.nickname === myNickname;
                    return (
                      <div
                        key={c.id || `${idx}-${c.nickname}`}
                        id={c.id ? `map-comment-${c.id}` : undefined}
                        className="bg-white p-6 rounded-3xl border border-orange-50 shadow-sm scroll-mt-28"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-bold text-slate-900">
                            {c.nickname}
                            {(c.levelTitle || '').trim() ? (
                              <span className="text-violet-600 font-extrabold"> · 「{c.levelTitle}」</span>
                            ) : null}
                            {' · '}⭐ {c.rating ?? '-'}
                          </p>
                          <div className="flex flex-wrap gap-2 justify-end">
                            {isMine ? (
                              <>
                                {!remoteComments ? (
                                  <button
                                    type="button"
                                    className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-extrabold hover:bg-slate-200"
                                    onClick={() => {
                                      if (!requireLogin()) return;
                                      const nextText = window.prompt('댓글 수정', c.text || '');
                                      if (nextText == null) return;
                                      const trimmed = nextText.trim();
                                      if (!trimmed && !(c.photos?.length)) return;
                                      const next = [...comments];
                                      next[idx] = { ...c, text: trimmed };
                                      persistComments(next);
                                    }}
                                  >
                                    수정
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  className="px-3 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-extrabold hover:bg-red-100"
                                  onClick={() => {
                                    if (!requireLogin()) return;
                                    if (!window.confirm('이 댓글을 삭제할까요?')) return;
                                    if (remoteComments) {
                                      void (async () => {
                                        try {
                                          await deleteMapCommentById(restaurant.name, c.id);
                                          setComments(await fetchMapCommentsForRestaurant(restaurant.name));
                                        } catch (e) {
                                          alert(e?.message || '삭제에 실패했습니다.');
                                        }
                                      })();
                                    } else {
                                      persistComments(comments.filter((_, i) => i !== idx));
                                    }
                                  }}
                                >
                                  삭제
                                </button>
                              </>
                            ) : !isAdmin && isLoggedIn ? (
                              <button
                                type="button"
                                className="px-3 py-1 rounded-lg border border-slate-200 text-slate-500 text-xs font-extrabold hover:bg-slate-50"
                                onClick={async () => {
                                  if (!requireLogin('댓글 신고는 로그인 후 이용할 수 있습니다.')) return;
                                  const reason = window.prompt(
                                    '신고 사유를 입력해 주세요. (필수, 빈 값은 접수되지 않습니다.)',
                                  );
                                  if (reason === null) return;
                                  const trimmed = reason.trim();
                                  if (!trimmed) {
                                    alert('신고 내용을 입력해 주세요.');
                                    return;
                                  }
                                  await pushCommentReport({
                                    restaurantName: restaurant.name,
                                    commentIndex: idx,
                                    commentId: c.id,
                                    targetNickname: c.nickname,
                                    reporterNickname: myNickname,
                                    commentPreview: (c.text || '(텍스트 없음)').slice(0, 160),
                                    reason: trimmed,
                                  });
                                  alert('신고가 접수되었습니다. 추후 관리자에서 확인할 예정이에요.');
                                }}
                              >
                                신고
                              </button>
                            ) : null}
                            {isAdmin ? (
                              <button
                                type="button"
                                className="px-3 py-1 rounded-lg bg-amber-100 text-amber-900 text-xs font-extrabold hover:bg-amber-200"
                                onClick={() => {
                                  if (!window.confirm('관리자 권한으로 이 댓글을 삭제할까요?')) return;
                                  if (remoteComments) {
                                    void (async () => {
                                      try {
                                        await deleteMapCommentById(restaurant.name, c.id);
                                        setComments(await fetchMapCommentsForRestaurant(restaurant.name));
                                      } catch (e) {
                                        alert(e?.message || '삭제에 실패했습니다.');
                                      }
                                    })();
                                  } else {
                                    if (c.id) deleteMapCommentById(restaurant.name, c.id);
                                    else persistComments(comments.filter((_, i) => i !== idx));
                                    setComments(getMapCommentsForRestaurant(restaurant.name));
                                  }
                                }}
                              >
                                관리 삭제
                              </button>
                            ) : null}
                          </div>
                        </div>
                        {c.text ? <p className="text-slate-600 text-sm leading-relaxed mt-2">{c.text}</p> : null}
                        {c.photos?.length ? (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {c.photos.map((src, pi) => (
                              <div key={`${c.id}-${pi}`} className="relative inline-block">
                                <button
                                  type="button"
                                  className="p-0 border-0 bg-transparent cursor-zoom-in"
                                  onClick={() => openImageTab(src, '이미지')}
                                >
                                  <img src={src} alt="" className="h-16 w-16 object-cover rounded-xl border border-slate-200" />
                                </button>
                                {isAdmin && !remoteComments ? (
                                  <button
                                    type="button"
                                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-bold leading-none"
                                    aria-label="첨부 삭제"
                                    onClick={() => {
                                      if (!c.id) return;
                                      removePhotoFromMapComment(restaurant.name, c.id, src);
                                      setComments(getMapCommentsForRestaurant(restaurant.name));
                                    }}
                                  >
                                    ×
                                  </button>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>

          <aside className="w-full lg:w-[min(100%,400px)] shrink-0">
            <div className="lg:sticky lg:top-24 rounded-[2rem] border border-orange-100 bg-white shadow-lg shadow-orange-100/40 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2 bg-gradient-to-r from-orange-50/80 to-white">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-white shadow-sm">
                  <iconify-icon icon="lucide:map-pin" class="text-lg"></iconify-icon>
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-orange-600 uppercase tracking-wide">위치</p>
                  <p className="text-sm font-extrabold text-slate-900 truncate">{title}</p>
                </div>
              </div>
              <div className="relative h-[min(42vh,360px)] min-h-[240px] w-full bg-slate-100">
                <div id="kakao-map-detail" className="absolute inset-0 w-full h-full" />
                {mapDetailStatus === 'loading' ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/85 backdrop-blur-[2px] text-sm font-extrabold text-slate-600">
                    지도 불러오는 중…
                  </div>
                ) : null}
                {mapDetailStatus === 'missing-key' ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/95 p-4 text-center text-xs font-bold text-slate-600">
                    카카오 지도 키가 없습니다. <code className="text-[10px]">.env.local</code>의 VITE_KAKAO_JS_KEY를 확인해 주세요.
                  </div>
                ) : null}
                {mapDetailStatus === 'error' ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/95 p-4 text-center text-xs font-bold text-red-600">
                    지도 SDK를 불러오지 못했습니다. 도메인 등록과 키를 확인해 주세요.
                  </div>
                ) : null}
                {mapDetailStatus === 'geocode-fail' ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/95 p-4 text-center text-xs font-bold text-slate-600">
                    주소를 지도에서 찾지 못했습니다.
                  </div>
                ) : null}
              </div>
              <p className="px-4 py-3 text-[11px] font-bold text-slate-500 leading-relaxed border-t border-slate-50">{address}</p>
            </div>
          </aside>
        </div>
      </main>

      {adminEditOpen && adminEditForm ? (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <h3 className="text-lg font-extrabold text-slate-900">상세 정보 변경</h3>
            {adminEditForm.isApproved ? (
              <label className="block text-xs font-bold text-slate-500">
                이름
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"
                  value={adminEditForm.name}
                  onChange={(e) => setAdminEditForm((f) => (f ? { ...f, name: e.target.value } : f))}
                />
              </label>
            ) : (
              <p className="text-sm font-bold text-slate-600">
                식당명: <span className="text-slate-900">{restaurant.name}</span>
                <span className="block text-[11px] font-extrabold text-slate-400 mt-1">
                  승인된 식당만 이름을 변경할 수 있습니다.
                </span>
              </p>
            )}
            <label className="block text-xs font-bold text-slate-500">
              주소
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"
                value={adminEditForm.address}
                onChange={(e) => setAdminEditForm((f) => (f ? { ...f, address: e.target.value } : f))}
              />
            </label>
            <label className="block text-xs font-bold text-slate-500">
              카테고리
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"
                value={adminEditForm.category}
                onChange={(e) => setAdminEditForm((f) => (f ? { ...f, category: e.target.value } : f))}
              >
                {EDIT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-bold text-slate-500">
              평점 (표시용)
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"
                value={adminEditForm.rating}
                onChange={(e) => setAdminEditForm((f) => (f ? { ...f, rating: e.target.value } : f))}
              />
            </label>
            <label className="block text-xs font-bold text-slate-500">
              가격대 (숫자·쉼표 등, 예: 5000, 7000)
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"
                value={adminEditForm.menuPriceLine}
                onChange={(e) => setAdminEditForm((f) => (f ? { ...f, menuPriceLine: e.target.value } : f))}
              />
            </label>
            <label className="block text-xs font-bold text-slate-500">
              전화
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"
                value={adminEditForm.phone}
                onChange={(e) => setAdminEditForm((f) => (f ? { ...f, phone: e.target.value } : f))}
              />
            </label>
            <label className="block text-xs font-bold text-slate-500">
              사진 URL (줄바꿈으로 구분)
              <textarea
                rows={4}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono"
                value={adminEditForm.photosLines}
                onChange={(e) => setAdminEditForm((f) => (f ? { ...f, photosLines: e.target.value } : f))}
              />
            </label>
            <div className="flex flex-wrap gap-2 justify-end pt-2">
              <button
                type="button"
                className="px-4 py-2 rounded-xl bg-slate-100 font-extrabold text-sm text-slate-700"
                onClick={() => {
                  setAdminEditOpen(false);
                  setAdminEditForm(null);
                }}
              >
                취소
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-xl bg-orange-600 font-extrabold text-sm text-white"
                onClick={saveAdminDetailEdit}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Layout>
  );
}
