import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { Auth } from '../lib/auth';

export default function BottomNav({
  searchSuggestions = [],
  onSearchKeyword,
  onSearchSuggest,
  onSelectSearchSuggestion,
}) {
  const location = useLocation();
  const { pathname } = location;
  const navigate = useNavigate();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [draftSearch, setDraftSearch] = useState('');
  const mobileSearchInputRef = useRef(null);
  const fromNavSearch = Boolean(location.state?.openMobileSearch);

  useEffect(() => {
    if (!fromNavSearch) return;
    setMobileSearchOpen(true);
    navigate(
      { pathname: location.pathname, search: location.search, hash: location.hash },
      { replace: true, state: {} },
    );
  }, [fromNavSearch, location.pathname, location.search, location.hash, navigate]);

  useEffect(() => {
    if (!mobileSearchOpen) return;
    const t = setTimeout(() => mobileSearchInputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [mobileSearchOpen]);

  useEffect(() => {
    if (!mobileSearchOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setMobileSearchOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileSearchOpen]);

  const goReview = (e) => {
    if (e) e.preventDefault();
    if (!Auth.isLoggedIn()) {
      alert('식당 등록·제보는 로그인 후 이용할 수 있습니다.');
      navigate(`/login?next=${encodeURIComponent('/review')}`);
      return;
    }
    navigate('/review');
  };

  const active = (key) => {
    if (key === 'map') return pathname === '/' && !mobileSearchOpen;
    if (key === 'wallet') return pathname === '/wallet';
    if (key === 'profile') return pathname === '/profile';
    if (key === 'search') return mobileSearchOpen;
    return false;
  };

  const cls = (key) =>
    active(key)
      ? 'text-orange-500'
      : 'text-slate-400 hover:text-white transition-colors';

  const openMobileSearch = () => {
    if (pathname !== '/') {
      navigate('/', { state: { openMobileSearch: true } });
      return;
    }
    setDraftSearch('');
    setMobileSearchOpen(true);
  };

  const closeMobileSearch = () => {
    setMobileSearchOpen(false);
    setDraftSearch('');
    if (onSearchSuggest) onSearchSuggest('');
  };

  const submitSearch = (keyword) => {
    const v = String(keyword ?? draftSearch).trim();
    if (onSearchKeyword) onSearchKeyword(v);
    closeMobileSearch();
  };

  return (
    <>
      {mobileSearchOpen ? (
        <div
          className="md:hidden fixed inset-0 z-[130] flex flex-col bg-slate-900/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="장소 검색"
        >
          <div className="bg-white border-b border-orange-100 shadow-md px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={closeMobileSearch}
                className="shrink-0 w-10 h-10 rounded-xl text-slate-500 hover:bg-slate-100 flex items-center justify-center text-xl font-light"
                aria-label="닫기"
              >
                ×
              </button>
              <div className="flex-1 relative group">
                <iconify-icon
                  icon="lucide:search"
                  class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg group-focus-within:text-orange-500"
                ></iconify-icon>
                <input
                  ref={mobileSearchInputRef}
                  type="text"
                  placeholder="원하시는 장소를 검색해보세요.."
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:bg-white text-sm text-slate-700"
                  value={draftSearch}
                  onChange={(e) => {
                    const next = e.target.value;
                    setDraftSearch(next);
                    if (onSearchSuggest) onSearchSuggest(next);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitSearch(draftSearch);
                  }}
                />
              </div>
            </div>
            {draftSearch.trim() && Array.isArray(searchSuggestions) && searchSuggestions.length > 0 ? (
              <div className="max-h-[50vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-inner">
                {searchSuggestions.map((suggestion) => (
                  <button
                    key={`${suggestion.name}-${suggestion.address}`}
                    type="button"
                    className="w-full text-left px-4 py-3 hover:bg-orange-50 border-b last:border-b-0 border-slate-100"
                    onClick={() => {
                      setDraftSearch(suggestion.name);
                      if (onSelectSearchSuggestion) onSelectSearchSuggestion(suggestion.name);
                      else if (onSearchKeyword) onSearchKeyword(suggestion.name);
                      closeMobileSearch();
                    }}
                  >
                    <p className="text-sm font-bold text-slate-800">{suggestion.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{suggestion.address}</p>
                  </button>
                ))}
              </div>
            ) : null}
            <p className="text-[11px] font-bold text-slate-400 px-1">
              카카오 장소 검색과 동일하게 지도에 결과가 표시됩니다.
            </p>
          </div>
          <button
            type="button"
            className="flex-1 w-full min-h-0 cursor-default"
            onClick={closeMobileSearch}
            aria-hidden
          />
        </div>
      ) : null}

      <nav className="md:hidden fixed left-1/2 -translate-x-1/2 w-[min(92%,24rem)] max-w-sm h-16 bg-slate-900/95 backdrop-blur-xl rounded-[2rem] flex items-center justify-around px-1.5 z-[100] shadow-2xl border border-white/10 bottom-[max(1rem,env(safe-area-inset-bottom,0px))] sm:bottom-6">
        <Link to="/" className={`flex flex-col items-center gap-1 min-w-[3rem] ${cls('map')}`}>
          <iconify-icon icon="lucide:map" class="text-2xl"></iconify-icon>
          <span className="text-[10px] font-bold">지도</span>
        </Link>
        <button
          type="button"
          onClick={openMobileSearch}
          className={`flex flex-col items-center gap-1 min-w-[3rem] bg-transparent border-0 p-0 cursor-pointer ${cls('search')}`}
        >
          <iconify-icon icon="lucide:search" class="text-2xl"></iconify-icon>
          <span className="text-[10px] font-bold">검색</span>
        </button>
        <div className="-mt-12 shrink-0">
          <button
            type="button"
            onClick={goReview}
            className="w-14 h-14 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-red-500/40 border-4 border-slate-900"
            aria-label="식당 등록하기"
          >
            <iconify-icon icon="lucide:plus" class="text-2xl"></iconify-icon>
          </button>
        </div>
        <Link to="/profile" className={`flex flex-col items-center gap-1 min-w-[3rem] ${cls('profile')}`}>
          <iconify-icon icon="lucide:user-round" class="text-2xl"></iconify-icon>
          <span className="text-[10px] font-bold">프로필</span>
        </Link>
        <Link to="/wallet" className={`flex flex-col items-center gap-1 min-w-[3rem] ${cls('wallet')}`}>
          <iconify-icon icon="lucide:wallet" class="text-2xl"></iconify-icon>
          <span className="text-[10px] font-bold">내지갑</span>
        </Link>
      </nav>
    </>
  );
}
