import Layout from '../components/Layout';
import { Link } from 'react-router-dom';
import ImageWithFallback from '../components/ImageWithFallback';
import { useEffect, useState } from 'react';
import { isApiConfigured } from '../lib/api';
import { AUTH_CHANGED, isApiSession } from '../lib/auth';
import {
  BOOKMARKS_CHANGED,
  getBookmarkedRestaurantNames,
  loadBookmarksFromApi,
  toggleRestaurantBookmark,
} from '../lib/bookmarks';
import { RESTAURANTS_CHANGED } from '../lib/approvedRestaurants';
import { detailPathForRestaurant, getAllRestaurants } from '../data/mainRestaurants';

const CATEGORY_OPTIONS = [
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
const MAX_PRICE = 1000000;

const MOBILE_PRICE_PRESETS = [
  { key: 'all', label: '전체', min: 0, max: MAX_PRICE },
  { key: 'under5k', label: '~5천', min: 0, max: 5000 },
  { key: '5to10', label: '5천~1만', min: 5000, max: 10000 },
  { key: 'over10k', label: '1만↑', min: 10000, max: MAX_PRICE },
];

function matchesPricePreset(minPrice, maxPrice, preset) {
  return minPrice === preset.min && maxPrice === preset.max;
}

const formatWon = (value) => `${value.toLocaleString('ko-KR')}원`;
const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

function buildWalletItemsFromBookmarks() {
  const names = getBookmarkedRestaurantNames();
  const all = getAllRestaurants();
  return names.map((name) => {
    const r = all.find((x) => x.name === name);
    const ratingNum = r ? Number(r.rating) || 0 : 0;
    const menuPrices =
      r && Array.isArray(r.menuPrices) && r.menuPrices.length ? r.menuPrices : [5000];
    return {
      id: r?.approvedId || name,
      name,
      address: r?.address || '주소 정보 없음',
      category: r?.category || '기타',
      menuPrices,
      ratings: [ratingNum],
      reviewCount: r?.reviewCount ?? 0,
      userPhotos: r && Array.isArray(r.photos) ? r.photos : [],
      favorite: true,
    };
  });
}

export default function WalletPage() {
  const [tab, setTab] = useState('all');
  const [selectedCategories, setSelectedCategories] = useState(['전체']);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(MAX_PRICE);
  const [items, setItems] = useState([]);
  const [mobilePriceExpanded, setMobilePriceExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function sync() {
      if (isApiConfigured() && isApiSession()) {
        await loadBookmarksFromApi();
      }
      if (cancelled) return;
      setItems(buildWalletItemsFromBookmarks());
    }
    void sync();
    const onChange = () => void sync();
    window.addEventListener(AUTH_CHANGED, onChange);
    window.addEventListener(RESTAURANTS_CHANGED, onChange);
    window.addEventListener(BOOKMARKS_CHANGED, onChange);
    return () => {
      cancelled = true;
      window.removeEventListener(AUTH_CHANGED, onChange);
      window.removeEventListener(RESTAURANTS_CHANGED, onChange);
      window.removeEventListener(BOOKMARKS_CHANGED, onChange);
    };
  }, []);

  const toggleCategory = (category) => {
    if (category === '전체') {
      setSelectedCategories(['전체']);
      return;
    }

    setSelectedCategories((prev) => {
      const withoutAll = prev.filter((item) => item !== '전체');
      const next = withoutAll.includes(category)
        ? withoutAll.filter((item) => item !== category)
        : [...withoutAll, category];
      return next.length ? next : ['전체'];
    });
  };

  const resetFilters = () => {
    setSelectedCategories(['전체']);
    setMinPrice(0);
    setMaxPrice(MAX_PRICE);
  };

  const toggleFavorite = async (id) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    try {
      await toggleRestaurantBookmark(item.name);
      setItems(buildWalletItemsFromBookmarks());
    } catch (e) {
      alert(e?.message || '즐겨찾기 처리에 실패했습니다.');
    }
  };

  const filteredItems = items
    .filter((item) => item.favorite)
    .filter((item) => selectedCategories.includes('전체') || selectedCategories.includes(item.category))
    .filter((item) => {
      const priceAvg = avg(item.menuPrices);
      return priceAvg >= minPrice && priceAvg <= maxPrice;
    });

  const sortedItems = [...filteredItems].sort((a, b) => {
    const aPrice = avg(a.menuPrices);
    const bPrice = avg(b.menuPrices);
    const aRating = avg(a.ratings);
    const bRating = avg(b.ratings);

    if (tab === 'price-low') return aPrice - bPrice;
    if (tab === 'price-high') return bPrice - aPrice;
    if (tab === 'review') return b.reviewCount - a.reviewCount;
    if (tab === 'rating') return bRating - aRating;
    return 0;
  });

  const sortTabs = [
    ['all', '전체'],
    ['price-low', '가격↓'],
    ['price-high', '가격↑'],
    ['review', '리뷰'],
    ['rating', '평점'],
  ];

  return (
    <Layout>
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 md:py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="max-w-xl">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-orange-400 sm:text-[11px] sm:text-slate-400">
              SAVED PLACES
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl md:text-4xl">내 보물함 맛지갑</h1>
            <p className="mt-1.5 text-xs text-slate-500 sm:mt-2 sm:text-sm md:text-base">지갑을 지켜주는 든든한 가성비 맛집들입니다.</p>
          </div>
          <div className="hidden lg:flex flex-col items-end gap-3">
            <div className="inline-flex p-1.5 bg-white rounded-3xl border border-orange-100 shadow-sm">
              {[
                ['all', '전체'],
                ['price-low', '가격 낮은순'],
                ['price-high', '가격 높은순'],
                ['review', '리뷰순'],
                ['rating', '평점순'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`px-5 py-2.5 rounded-2xl text-sm font-extrabold transition-colors ${
                    tab === key
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                      : 'text-slate-600 hover:bg-white/70'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-3 lg:hidden">
          <div className="-mx-1 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {sortTabs.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`shrink-0 rounded-full px-3.5 py-2 text-[12px] font-extrabold transition-all active:scale-[0.98] ${
                  tab === key
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-300/40'
                    : 'border border-slate-200/90 bg-white text-slate-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="rounded-[1.25rem] border border-orange-100/50 bg-gradient-to-br from-white via-orange-50/40 to-amber-50/50 p-3 shadow-[0_12px_40px_-16px_rgba(234,88,12,0.35)]">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-black tracking-[0.2em] text-orange-600">맛 태그</span>
              <button
                type="button"
                onClick={resetFilters}
                className="text-[11px] font-bold text-slate-400 hover:text-orange-600"
              >
                초기화
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_OPTIONS.map((category) => {
                const on = selectedCategories.includes(category);
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold transition-all ${
                      on
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white/90 text-slate-600 ring-1 ring-slate-200/90'
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 border-t border-orange-100/70 pt-2.5">
              <p className="mb-1.5 text-[10px] font-black tracking-[0.15em] text-slate-400">가격</p>
              <div className="flex flex-wrap gap-1.5">
                {MOBILE_PRICE_PRESETS.map((p) => {
                  const active = matchesPricePreset(minPrice, maxPrice, p);
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => {
                        setMinPrice(p.min);
                        setMaxPrice(p.max);
                      }}
                      className={`rounded-full px-3 py-1.5 text-[11px] font-extrabold transition-all ${
                        active
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : 'bg-white/95 text-slate-600 ring-1 ring-emerald-100'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setMobilePriceExpanded((v) => !v)}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-white/70 py-2 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200/60"
              >
                <iconify-icon
                  icon={mobilePriceExpanded ? 'lucide:chevron-up' : 'lucide:sliders-horizontal'}
                  class="text-sm"
                ></iconify-icon>
                {mobilePriceExpanded ? '직접 조절 접기' : '가격 직접 조절'}
              </button>
              {mobilePriceExpanded ? (
                <div className="mt-2 rounded-xl border border-slate-100 bg-white/95 p-3">
                  <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-500">
                    <span>{formatWon(minPrice)}</span>
                    <span>{formatWon(maxPrice)}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={minPrice.toLocaleString('ko-KR')}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^\d]/g, '');
                        const next = clamp(Number(raw || 0), 0, MAX_PRICE);
                        setMinPrice(Math.min(next, maxPrice));
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700"
                      placeholder="최소"
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={maxPrice.toLocaleString('ko-KR')}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^\d]/g, '');
                        const next = clamp(Number(raw || 0), 0, MAX_PRICE);
                        setMaxPrice(Math.max(next, minPrice));
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700"
                      placeholder="최대"
                    />
                  </div>
                  <div className="mt-3 space-y-2">
                    <input
                      type="range"
                      min="0"
                      max={MAX_PRICE}
                      step="1000"
                      value={minPrice}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        setMinPrice(Math.min(value, maxPrice));
                      }}
                      className="w-full accent-orange-500"
                    />
                    <input
                      type="range"
                      min="0"
                      max={MAX_PRICE}
                      step="1000"
                      value={maxPrice}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        setMaxPrice(Math.max(value, minPrice));
                      }}
                      className="w-full accent-orange-500"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-8 lg:mt-10 lg:grid-cols-[320px_1fr] lg:items-start">
          <aside className="hidden w-full lg:block">
            <div className="bg-white rounded-[2rem] border border-orange-50 shadow-sm p-6">
              <div className="mb-5">
                <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                  <iconify-icon icon="lucide:filter" class="text-orange-500"></iconify-icon>
                  카테고리
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {CATEGORY_OPTIONS.map((category) => (
                  <label key={category} className="flex items-center gap-2 text-sm font-bold text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-orange-500"
                      checked={selectedCategories.includes(category)}
                      onChange={() => toggleCategory(category)}
                    />
                    {category}
                  </label>
                ))}
              </div>

              <div className="mt-6 pt-5 border-t border-slate-100">
                <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2 mb-3">
                  <iconify-icon icon="lucide:wallet" class="text-orange-500"></iconify-icon>
                  가격대 조절
                </h2>
                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                  <div className="flex items-center justify-between text-xs font-extrabold text-slate-500 mb-3">
                    <span>{formatWon(minPrice)}</span>
                    <span>{formatWon(maxPrice)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={minPrice.toLocaleString('ko-KR')}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^\d]/g, '');
                        const next = clamp(Number(raw || 0), 0, MAX_PRICE);
                        setMinPrice(Math.min(next, maxPrice));
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-700"
                      placeholder="최소 가격"
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={maxPrice.toLocaleString('ko-KR')}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^\d]/g, '');
                        const next = clamp(Number(raw || 0), 0, MAX_PRICE);
                        setMaxPrice(Math.max(next, minPrice));
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-700"
                      placeholder="최대 가격"
                    />
                  </div>
                  <div className="space-y-3">
                    <input
                      type="range"
                      min="0"
                      max={MAX_PRICE}
                      step="1000"
                      value={minPrice}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        setMinPrice(Math.min(value, maxPrice));
                      }}
                      className="w-full accent-orange-500"
                    />
                    <input
                      type="range"
                      min="0"
                      max={MAX_PRICE}
                      step="1000"
                      value={maxPrice}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        setMaxPrice(Math.max(value, minPrice));
                      }}
                      className="w-full accent-orange-500"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-5 w-full py-3 rounded-2xl bg-white border-2 border-dashed border-slate-200 text-slate-500 font-extrabold text-sm hover:bg-slate-50 transition-colors"
                >
                  필터 초기화
                </button>
                <button
                  type="button"
                  className="mt-2 w-full py-3 rounded-2xl bg-orange-500 text-white font-extrabold text-sm hover:bg-orange-600 transition-colors"
                >
                  검색하기
                </button>
              </div>
            </div>

          </aside>

          <section className="flex-1 min-w-0">
            <div className="mb-4 flex flex-col gap-1 sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900 sm:text-lg md:text-xl">
                <iconify-icon icon="lucide:bookmark" class="text-orange-500"></iconify-icon>
                저장한 맛집
              </h2>
              <p className="hidden text-xs font-bold text-slate-400 md:block">
                표시: 즐겨찾기한 항목이며, 다시 누르면 즐겨찾기가 해제됩니다.
              </p>
            </div>
            {sortedItems.length === 0 ? (
              <div className="bg-white rounded-[2rem] border border-orange-100 p-8 text-center text-slate-500 font-bold">
                즐겨찾기한 음식점이 없습니다.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedItems.map((item) => {
                const avgPrice = avg(item.menuPrices);
                const avgRating = avg(item.ratings);
                const low = Math.round(avgPrice * 0.85);
                const high = Math.round(avgPrice * 1.15);
                return (
                <article key={item.name} className="group flex flex-col overflow-hidden rounded-2xl border border-orange-50 bg-white shadow-sm transition-all duration-500 hover:shadow-2xl sm:rounded-[2.5rem]">
                  <div className="relative aspect-[16/10] overflow-hidden">
                    {item.userPhotos.length > 0 ? (
                      <ImageWithFallback src={item.userPhotos[0]} alt={`${item.name} 이미지`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    ) : (
                      <div className="w-full h-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-400">
                        등록된 사진이 없습니다
                      </div>
                    )}
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                      <span className="px-3 py-1 bg-green-600 text-white rounded-full text-[10px] font-bold shadow-lg">저장 완료</span>
                      <span className="px-3 py-1 bg-white/90 backdrop-blur rounded-full text-[10px] font-bold text-orange-600">{item.category}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleFavorite(item.id)}
                      className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white hover:text-red-500 transition-all"
                    >
                      <iconify-icon icon="lucide:bookmark" class="text-xl"></iconify-icon>
                    </button>
                  </div>
                  <div className="p-5 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-orange-600 transition-colors">{item.name}</h3>
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                          <iconify-icon icon="lucide:map-pin" class="text-slate-300"></iconify-icon>
                          {item.address}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-orange-500 bg-orange-50 px-2 py-1 rounded-lg">
                        <iconify-icon icon="lucide:star" class="fill-orange-500"></iconify-icon>
                        <span className="font-bold text-sm">{avgRating.toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-50">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">평균가</span>
                        <span className="text-xl font-extrabold text-red-600 block">
                          {formatWon(low)} ~ {formatWon(high)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <Link
                        to={detailPathForRestaurant(item.name)}
                        className="text-sm font-extrabold text-orange-600 hover:underline"
                      >
                        상세보기
                      </Link>
                    </div>
                  </div>
                </article>
              );
              })}
            </div>
            )}
          </section>
        </div>
      </main>
    </Layout>
  );
}

