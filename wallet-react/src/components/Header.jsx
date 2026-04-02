import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Auth, AUTH_CHANGED } from '../lib/auth';
import { isApiConfigured } from '../lib/api';
import { getAdminPendingInboxCount } from '../lib/adminInboxCount';
import { refreshAdminInboxCaches } from '../lib/adminInboxRefresh';
import { ADMIN_INBOX_CHANGED } from '../lib/adminInboxEvents';

export default function Header({
  showAddButton = true,
  showSearch = true,
  onSearchKeyword,
  onSearchSuggest,
  searchSuggestions = [],
  onSelectSearchSuggestion,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchFocus, setSearchFocus] = useState(false);
  const [session, setSession] = useState(() => Auth.getSession());
  const profileImageUrl = session?.profileImage || '';
  const isAdminUser = session?.role === 'admin';
  const [adminInboxCount, setAdminInboxCount] = useState(0);

  useEffect(() => {
    const syncSession = () => setSession(Auth.getSession());
    window.addEventListener(AUTH_CHANGED, syncSession);
    return () => window.removeEventListener(AUTH_CHANGED, syncSession);
  }, []);

  useEffect(() => {
    if (!isAdminUser) {
      setAdminInboxCount(0);
      return undefined;
    }
    const syncInbox = () => setAdminInboxCount(getAdminPendingInboxCount());
    syncInbox();
    window.addEventListener(AUTH_CHANGED, syncInbox);
    window.addEventListener(ADMIN_INBOX_CHANGED, syncInbox);
    window.addEventListener('storage', syncInbox);
    window.addEventListener('focus', syncInbox);
    return () => {
      window.removeEventListener(AUTH_CHANGED, syncInbox);
      window.removeEventListener(ADMIN_INBOX_CHANGED, syncInbox);
      window.removeEventListener('storage', syncInbox);
      window.removeEventListener('focus', syncInbox);
    };
  }, [isAdminUser]);

  useEffect(() => {
    if (!isAdminUser || !isApiConfigured()) return undefined;
    let cancelled = false;
    const pullInbox = () => {
      void refreshAdminInboxCaches().then(() => {
        if (!cancelled) {
          setAdminInboxCount(getAdminPendingInboxCount());
        }
      });
    };
    pullInbox();
    window.addEventListener(AUTH_CHANGED, pullInbox);
    const id = setInterval(pullInbox, 90_000);
    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener(AUTH_CHANGED, pullInbox);
    };
  }, [isAdminUser]);

  useEffect(() => {
    if (!onSearchSuggest) return;

    const timer = setTimeout(() => {
      onSearchSuggest(searchText);
    }, 120);

    return () => clearTimeout(timer);
  }, [onSearchSuggest, searchText]);

  const goIfLoggedIn = (to, message = '로그인이 필요합니다.') => {
    if (!Auth.isLoggedIn()) {
      alert(message);
      navigate(`/login?next=${encodeURIComponent(to)}`, { replace: true });
      return;
    }
    navigate(to);
  };

  const goReview = () => {
    goIfLoggedIn('/review', '식당 등록·제보는 로그인 후 이용할 수 있습니다.');
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-orange-100 pt-[env(safe-area-inset-top,0px)]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 relative flex items-center justify-end md:justify-between gap-2 sm:gap-4">
        <Link
          to="/"
          className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 sm:gap-2 md:static md:left-auto md:z-0 md:translate-x-0 md:translate-y-0"
          onClick={() => setOpen(false)}
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-200">
            <iconify-icon icon="lucide:wallet" class="text-white text-lg sm:text-xl"></iconify-icon>
          </div>
          <span className="text-[17px] sm:text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap">
            <span className="text-orange-600">지갑</span>지키미
          </span>
        </Link>

        {showSearch ? (
          <div className="hidden md:block flex-1 max-w-xl relative group mx-4">
            <iconify-icon
              icon="lucide:search"
              class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg group-focus-within:text-orange-500 transition-colors"
            ></iconify-icon>
            <input
              type="text"
              placeholder="원하시는 장소를 검색해보세요.."
              className="w-full pl-11 pr-4 py-2 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all text-sm text-slate-700"
              value={searchText}
              onChange={(e) => {
                const next = e.target.value;
                setSearchText(next);
                if (onSearchSuggest) onSearchSuggest(next);
              }}
              onFocus={() => setSearchFocus(true)}
              onBlur={() => setTimeout(() => setSearchFocus(false), 120)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && onSearchKeyword) onSearchKeyword(searchText);
              }}
            />
            {searchFocus && searchText.trim() && searchSuggestions.length > 0 ? (
              <div className="absolute z-[140] mt-2 w-full rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                {searchSuggestions.map((suggestion) => (
                  <button
                    key={`${suggestion.name}-${suggestion.address}`}
                    type="button"
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b last:border-b-0 border-slate-100"
                    onClick={() => {
                      setSearchText(suggestion.name);
                      if (onSelectSearchSuggestion) onSelectSearchSuggestion(suggestion.name);
                      setSearchFocus(false);
                    }}
                  >
                    <p className="text-sm font-bold text-slate-800">{suggestion.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{suggestion.address}</p>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="hidden md:block flex-1" />
        )}

        <div className="flex items-center gap-2 relative z-20 shrink-0">
          {showAddButton ? (
            <button
              type="button"
              onClick={goReview}
              className="hidden md:flex items-center gap-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2.5 rounded-2xl text-sm font-extrabold hover:from-orange-600 hover:to-red-600 transition-all shadow-lg shadow-orange-200/70 hover:shadow-orange-300/70 border border-white/40"
            >
              <iconify-icon icon="lucide:plus-circle" class="text-base"></iconify-icon>
              <span>식당 추가하기</span>
            </button>
          ) : null}

          <button
            type="button"
            className="relative w-9 h-9 rounded-full border border-slate-200 overflow-visible cursor-pointer shrink-0 md:ml-2"
            onClick={() => setOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={open ? 'true' : 'false'}
            aria-label={isAdminUser && adminInboxCount > 0 ? `프로필 메뉴, 대기 요청 ${adminInboxCount}건` : '프로필 메뉴'}
          >
            <span className="block w-full h-full rounded-full overflow-hidden bg-[#f4f5f7]">
              {profileImageUrl ? (
                <img
                  src={profileImageUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="flex w-full h-full items-center justify-center text-slate-500">
                  <iconify-icon icon="lucide:user-round" class="text-base"></iconify-icon>
                </span>
              )}
            </span>
            {isAdminUser && adminInboxCount > 0 ? (
              <span className="pointer-events-none absolute -top-1 -right-1 z-10 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-extrabold leading-[18px] text-center border-2 border-white shadow-sm tabular-nums">
                {adminInboxCount > 99 ? '99+' : adminInboxCount}
              </span>
            ) : null}
          </button>

          {open ? (
            <div
              className="absolute right-0 top-full mt-2 w-36 rounded-2xl border border-slate-200 bg-white shadow-lg z-[120] overflow-hidden"
              role="menu"
              onMouseLeave={() => setOpen(false)}
            >
              <button
                type="button"
                className="w-full text-left block px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setOpen(false);
                  goIfLoggedIn('/profile');
                }}
              >
                나의 프로필
              </button>
              <button
                type="button"
                className="w-full text-left block px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 border-t border-slate-100"
                onClick={() => {
                  setOpen(false);
                  goIfLoggedIn('/wallet');
                }}
              >
                나의 지갑
              </button>
              {Auth.isAdmin() ? (
                <button
                  type="button"
                  className="w-full text-left flex items-center justify-between gap-2 px-4 py-3 text-sm font-extrabold text-violet-700 hover:bg-violet-50 border-t border-slate-100"
                  onClick={() => {
                    setOpen(false);
                    navigate('/admin');
                  }}
                >
                  <span>관리자 콘솔</span>
                  {adminInboxCount > 0 ? (
                    <span className="shrink-0 min-w-[1.25rem] px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-extrabold tabular-nums leading-none text-center">
                      {adminInboxCount > 99 ? '99+' : adminInboxCount}
                    </span>
                  ) : null}
                </button>
              ) : null}
              {Auth.isLoggedIn() ? (
                <button
                  type="button"
                  className="w-full text-left block px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 border-t border-slate-100"
                  onClick={() => {
                    setOpen(false);
                    Auth.logout();
                    navigate('/', { replace: true });
                  }}
                >
                  로그아웃
                </button>
              ) : (
                <button
                  type="button"
                  className="w-full text-left block px-4 py-3 text-sm font-bold text-orange-600 hover:bg-orange-50 border-t border-slate-100"
                  onClick={() => {
                    setOpen(false);
                    const next = `${location.pathname}${location.search}`;
                    navigate(`/login?next=${encodeURIComponent(next || '/')}`);
                  }}
                >
                  로그인
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

