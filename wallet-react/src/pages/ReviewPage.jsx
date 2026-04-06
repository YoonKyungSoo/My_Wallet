import Layout from '../components/Layout';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { REGISTER_MAX_PHOTOS } from '../lib/mediaLimits';
import { fileToProfileDataUrl } from '../lib/profileImage';
import { getRestaurantByName } from '../data/mainRestaurants';
import { Auth } from '../lib/auth';
import { addBugReport } from '../lib/bugReports';
import { addPendingSubmission } from '../lib/pendingRestaurantSubmissions';

const CATEGORY_OPTIONS = [
  '🍚 한식',
  '🍜 중식',
  '🍣 일식',
  '🍝 양식',
  '🥖 분식',
  '🍲 면요리',
  '🍗 치킨',
  '🍔 버거',
  '☕ 카페',
  '🥐 베이커리',
  '🏪 편의점/마트',
  '🎀 기타',
];

export default function ReviewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isBugReport = searchParams.get('type') === 'bug';
  const bugRestaurantParam = searchParams.get('r')?.trim() || '';
  const [rating, setRating] = useState(4);
  const [photos, setPhotos] = useState([]);
  const [restaurantName, setRestaurantName] = useState(
    isBugReport && bugRestaurantParam ? bugRestaurantParam : '',
  );
  const [restaurantAddress, setRestaurantAddress] = useState(() => {
    if (isBugReport && bugRestaurantParam) {
      return getRestaurantByName(bugRestaurantParam)?.address || '';
    }
    return '';
  });
  const [bugDescription, setBugDescription] = useState('');
  const [menuName, setMenuName] = useState('');
  const [menuPrice, setMenuPrice] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [searchFocus, setSearchFocus] = useState(false);
  const [myLocation, setMyLocation] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitDone, setSubmitDone] = useState(false);
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const placesServiceRef = useRef(null);
  const uploadMaxSide =
    typeof window !== 'undefined' && window.innerWidth < 768
      ? 720
      : 960;

  const formatPriceKRW = (value) => {
    const digits = value.replace(/[^\d]/g, '');
    if (!digits) return '';
    return `${Number(digits).toLocaleString('ko-KR')}원`;
  };

  useEffect(() => {
    if (!window.kakao?.maps?.services) {
      const scriptId = 'kakao-map-sdk';
      const existing = document.getElementById(scriptId);

      const onLoaded = () => {
        window.kakao.maps.load(() => {
          placesServiceRef.current = new window.kakao.maps.services.Places();
        });
      };

      if (existing) {
        if (window.kakao?.maps?.services) {
          placesServiceRef.current = new window.kakao.maps.services.Places();
        } else {
          existing.addEventListener('load', onLoaded);
        }
        return () => existing.removeEventListener('load', onLoaded);
      }

      const script = document.createElement('script');
      script.id = scriptId;
      script.async = true;
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${import.meta.env.VITE_KAKAO_JS_KEY}&libraries=services,clusterer,drawing&autoload=false`;
      script.addEventListener('load', onLoaded);
      document.head.appendChild(script);
      return () => script.removeEventListener('load', onLoaded);
    }

    placesServiceRef.current = new window.kakao.maps.services.Places();
    return undefined;
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setMyLocation({ lat: coords.latitude, lng: coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    );
  }, []);

  useEffect(() => {
    if (!isBugReport) return;
    if (!bugRestaurantParam) {
      setRestaurantName('');
      return;
    }
    setRestaurantName(bugRestaurantParam);
    const hit = getRestaurantByName(bugRestaurantParam);
    setRestaurantAddress(hit?.address || '');
  }, [isBugReport, bugRestaurantParam]);

  useEffect(() => {
    if (isBugReport) return;
    const keyword = restaurantName.trim();
    const places = placesServiceRef.current;
    if (!keyword || !places || !window.kakao?.maps?.services) return;

    const timer = setTimeout(() => {
      const options = myLocation
        ? {
            x: myLocation.lng,
            y: myLocation.lat,
            sort: window.kakao.maps.services.SortBy.DISTANCE,
            radius: 20000,
            size: 10,
          }
        : { size: 10 };

      places.keywordSearch(keyword, (data, status) => {
        if (status !== window.kakao.maps.services.Status.OK || !data.length) {
          setSearchSuggestions([]);
          return;
        }

        setSearchSuggestions(
          data.slice(0, 6).map((place) => ({
            name: place.place_name,
            address: place.road_address_name || place.address_name || '주소 정보 없음',
          })),
        );
      }, options);
    }, 120);

    return () => clearTimeout(timer);
  }, [myLocation, restaurantName, isBugReport]);

  const handleSubmit = async () => {
    if (isBugReport) {
      const name = restaurantName.trim() || bugRestaurantParam.trim();
      const nextErrors = {
        restaurantName: !name,
        bugDescription: !bugDescription.trim(),
      };
      setErrors(nextErrors);
      if (Object.values(nextErrors).some(Boolean)) return;

      const photoUrls = [];
      for (const file of photos.slice(0, REGISTER_MAX_PHOTOS)) {
        try {
          photoUrls.push(await fileToProfileDataUrl(file, uploadMaxSide, 0.8));
        } catch (e) {
          alert(e?.message || '사진을 처리하지 못했습니다. 다른 파일로 바꿔 주세요.');
          return;
        }
      }

      const hit = getRestaurantByName(name);
      try {
        await addBugReport({
          restaurantName: name,
          restaurantAddress: hit?.address || restaurantAddress.trim(),
          bugDescription: bugDescription.trim(),
          photos: photoUrls,
          reporterId: Auth.getSession()?.id || null,
        });
      } catch {
        /* ignore */
      }
      setSubmitDone(true);
      setTimeout(() => navigate('/', { replace: true }), 1300);
      return;
    }

    const nextErrors = {
      restaurantName: !restaurantName.trim(),
      menuName: !menuName.trim(),
      menuPrice: !menuPrice.trim(),
      rating: !rating,
    };

    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    const rn = restaurantName.trim();
    if (getRestaurantByName(rn)) {
      alert('이미 지도에 등록된 식당입니다. 이름·지점이 같은지 확인하거나 표기를 바꿔 주세요.');
      return;
    }

    const photoUrls = [];
    for (const file of photos.slice(0, REGISTER_MAX_PHOTOS)) {
      try {
        photoUrls.push(await fileToProfileDataUrl(file, uploadMaxSide, 0.8));
      } catch (e) {
        alert(e?.message || '사진을 처리하지 못했습니다. 다른 파일로 바꿔 주세요.');
        return;
      }
    }

    try {
      await addPendingSubmission({
        restaurantName: restaurantName.trim(),
        restaurantAddress: restaurantAddress.trim(),
        category,
        menuName: menuName.trim(),
        menuPrice: menuPrice.trim(),
        rating,
        photos: photoUrls,
        submitterId: Auth.getSession()?.id || null,
      });
    } catch (e) {
      if (e && (e.name === 'QuotaExceededError' || e.code === 22)) {
        alert('저장 용량이 부족합니다. 사진 장수를 줄이거나 용량이 작은 이미지로 시도해 주세요.');
        return;
      }
      throw e;
    }

    alert('제보가 접수되었습니다. 관리자 승인 후 지도에 표시됩니다.');

    setSubmitDone(true);
    setTimeout(() => {
      navigate('/', { replace: true });
    }, 1300);
  };

  return (
    <Layout showSearch={false} showAddButton={false}>
      <section className="pt-10 pb-6 md:pt-14 md:pb-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white border border-orange-100 shadow-sm mb-5">
            <iconify-icon icon="lucide:wallet" class="text-2xl text-orange-600"></iconify-icon>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
            {isBugReport ? '버그 제보' : '식당 추가하기'}
          </h1>
          <p className="mt-3 text-sm md:text-base text-slate-500">
            {isBugReport
              ? '앱 오류·잘못된 정보·개선이 필요한 점을 알려주세요. (추후 관리자 검토)'
              : '아직 등록되지 않은 가성비 식당을 알려주세요.'}
          </p>
        </div>
      </section>

      <section className="pb-14 md:pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-[2.5rem] border border-orange-50 shadow-sm overflow-hidden">
            <div className="p-7 sm:p-10">
              <h2 className="text-xl font-extrabold text-slate-900">
                {isBugReport ? '버그·오류 제보 내용' : '새로운 보물 식당 제보'}
              </h2>
              <p className="text-sm text-slate-500 mt-1 mb-5">
                {isBugReport
                  ? '증상·기대 동작·발생 시점을 적어 주시면 수정에 큰 도움이 됩니다. 스크린샷은 선택입니다.'
                  : '아직 등록되지 않은 단골집을 알려주세요.'}
              </p>
              {isBugReport ? (
                <div className="space-y-5">
                  <div>
                    <p className="text-xs font-extrabold text-slate-500 mb-2">식당 상호명</p>
                    {errors.restaurantName ? (
                      <p className="text-[11px] font-bold text-red-500 mb-1">식당 정보가 없습니다. 상세 페이지에서 버그 제보를 눌러 주세요.</p>
                    ) : null}
                    <div className="w-full px-4 py-3 rounded-2xl text-sm bg-slate-100 text-slate-900 font-bold">
                      {restaurantName.trim() || bugRestaurantParam || '—'}
                    </div>
                  </div>
                  <div>
                    {errors.bugDescription ? (
                      <p className="text-[11px] font-bold text-red-500 mb-1">*필수항목</p>
                    ) : null}
                    <textarea
                      rows={6}
                      className={`w-full px-4 py-3 rounded-2xl text-sm resize-y min-h-[140px] ${errors.bugDescription ? 'bg-red-50 border border-red-200' : 'bg-slate-100 border border-transparent'}`}
                      placeholder="문제가 되는 부분을 자세히 설명해주세요"
                      value={bugDescription}
                      onChange={(e) => {
                        setBugDescription(e.target.value);
                        if (e.target.value.trim()) setErrors((prev) => ({ ...prev, bugDescription: false }));
                      }}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-slate-500 mb-3">사진 추가</p>
                    <label className="block w-full border-2 border-dashed border-orange-200 rounded-3xl bg-orange-50/40 p-8 text-center cursor-pointer hover:bg-orange-50 transition-colors">
                      <iconify-icon icon="lucide:image-plus" class="text-2xl text-orange-500"></iconify-icon>
                      <p className="text-sm font-extrabold text-slate-700 mt-2">사진 업로드하기</p>
                      <p className="text-[11px] text-slate-400 font-bold mt-1">
                        JPG, PNG 최대 {REGISTER_MAX_PHOTOS}장
                      </p>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const selected = Array.from(e.target.files || []).slice(0, REGISTER_MAX_PHOTOS);
                          setPhotos(selected);
                        }}
                      />
                    </label>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {photos.length > 0 ? (
                        photos.map((file) => (
                          <span key={file.name} className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600">
                            {file.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs font-bold text-slate-400">선택된 사진이 없습니다.</span>
                      )}
                    </div>
                    {photos.length >= REGISTER_MAX_PHOTOS ? (
                      <p className="mt-2 text-[11px] font-bold text-orange-500">
                        사진은 최대 {REGISTER_MAX_PHOTOS}장까지 업로드할 수 있습니다.
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="relative">
                  {errors.restaurantName ? (
                    <p className="text-[11px] font-bold text-red-500 mb-1">*필수항목</p>
                  ) : null}
                  <input
                    className={`w-full px-4 py-3 rounded-2xl text-sm ${errors.restaurantName ? 'bg-red-50 border border-red-200' : 'bg-slate-100'}`}
                    placeholder="식당 상호명을 검색하세요"
                    value={restaurantName}
                    onChange={(e) => {
                      const next = e.target.value;
                      setRestaurantName(next);
                      if (next.trim()) setErrors((prev) => ({ ...prev, restaurantName: false }));
                      if (!next.trim()) setSearchSuggestions([]);
                      setSearchFocus(true);
                    }}
                    onFocus={() => setSearchFocus(true)}
                    onBlur={() => setTimeout(() => setSearchFocus(false), 120)}
                  />
                  {searchFocus && restaurantName.trim() && searchSuggestions.length > 0 ? (
                    <div className="absolute z-[120] mt-2 w-full rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                      {searchSuggestions.map((item) => (
                        <button
                          key={`${item.name}-${item.address}`}
                          type="button"
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b last:border-b-0 border-slate-100"
                          onClick={() => {
                            setRestaurantName(item.name);
                            setRestaurantAddress(item.address);
                            setSearchFocus(false);
                          }}
                        >
                          <p className="text-sm font-bold text-slate-800">{item.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{item.address}</p>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <select
                  className="w-full px-4 py-3 bg-slate-100 rounded-2xl text-sm"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <input
                  className="w-full px-4 py-3 bg-slate-100 rounded-2xl text-sm md:col-span-2"
                  placeholder="상호명 선택 시 정확한 주소가 자동 입력됩니다"
                  value={restaurantAddress}
                  onChange={(e) => setRestaurantAddress(e.target.value)}
                />
                <div>
                  {errors.menuName ? (
                    <p className="text-[11px] font-bold text-red-500 mb-1">*필수항목</p>
                  ) : null}
                  <input
                    className={`w-full px-4 py-3 rounded-2xl text-sm ${errors.menuName ? 'bg-red-50 border border-red-200' : 'bg-slate-100'}`}
                    placeholder="식사 메뉴 이름"
                    value={menuName}
                    onChange={(e) => {
                      setMenuName(e.target.value);
                      if (e.target.value.trim()) setErrors((prev) => ({ ...prev, menuName: false }));
                    }}
                  />
                </div>
                <div>
                  {errors.menuPrice ? (
                    <p className="text-[11px] font-bold text-red-500 mb-1">*필수항목</p>
                  ) : null}
                  <input
                    className={`w-full px-4 py-3 rounded-2xl text-sm ${errors.menuPrice ? 'bg-red-50 border border-red-200' : 'bg-slate-100'}`}
                    placeholder="식사 메뉴 가격"
                    inputMode="numeric"
                    value={menuPrice}
                    onChange={(e) => {
                      const formatted = formatPriceKRW(e.target.value);
                      setMenuPrice(formatted);
                      if (formatted.trim()) setErrors((prev) => ({ ...prev, menuPrice: false }));
                    }}
                  />
                </div>

                <div className={`md:col-span-2 rounded-3xl p-5 border ${errors.rating ? 'bg-red-50/70 border-red-200' : 'bg-slate-50/60 border-slate-100'}`}>
                  {errors.rating ? (
                    <p className="text-[11px] font-bold text-red-500 mb-1">*필수항목</p>
                  ) : null}
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-extrabold text-slate-500">맛 만족도 (1-5)</p>
                    <span className="text-sm font-extrabold text-orange-600">{rating}점</span>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((v) => (
                      <button
                        key={v}
                        type="button"
                        className={`w-12 h-12 rounded-2xl border-2 ${v <= rating ? 'border-orange-400 bg-orange-50' : 'border-orange-200 bg-white'}`}
                        onClick={() => {
                          setRating(v);
                          setErrors((prev) => ({ ...prev, rating: false }));
                        }}
                      >
                        <span className={v <= rating ? 'text-orange-500 text-xl' : 'text-slate-300 text-xl'}>★</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <p className="text-xs font-extrabold text-slate-500 mb-3">사진 추가</p>
                  <label className="block w-full border-2 border-dashed border-orange-200 rounded-3xl bg-orange-50/40 p-8 text-center cursor-pointer hover:bg-orange-50 transition-colors">
                    <iconify-icon icon="lucide:image-plus" class="text-2xl text-orange-500"></iconify-icon>
                    <p className="text-sm font-extrabold text-slate-700 mt-2">사진 업로드하기</p>
                    <p className="text-[11px] text-slate-400 font-bold mt-1">
                      JPG, PNG 최대 {REGISTER_MAX_PHOTOS}장 (상세 페이지에 모두 표시)
                    </p>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const selected = Array.from(e.target.files || []).slice(0, REGISTER_MAX_PHOTOS);
                        setPhotos(selected);
                      }}
                    />
                  </label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {photos.length > 0 ? (
                      photos.map((file) => (
                        <span key={file.name} className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600">
                          {file.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs font-bold text-slate-400">선택된 사진이 없습니다.</span>
                    )}
                  </div>
                  {photos.length >= REGISTER_MAX_PHOTOS ? (
                    <p className="mt-2 text-[11px] font-bold text-orange-500">
                      사진은 최대 {REGISTER_MAX_PHOTOS}장까지 업로드할 수 있습니다.
                    </p>
                  ) : null}
                </div>
              </div>
              )}
              <button
                type="button"
                onClick={handleSubmit}
                className="w-full mt-10 py-5 rounded-2xl bg-red-500 text-white font-extrabold shadow-2xl shadow-red-500/20 hover:bg-red-600 transition-colors"
              >
                제보하기
              </button>
            </div>
          </div>
        </div>
      </section>
      {submitDone ? (
        <div className="fixed inset-0 z-[200] bg-black/25 backdrop-blur-[2px] flex items-center justify-center px-4">
          <div className="w-full max-w-sm bg-white rounded-3xl border border-orange-100 shadow-2xl p-7 text-center animate-in fade-in zoom-in duration-200">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <iconify-icon icon="lucide:party-popper" class="text-2xl"></iconify-icon>
            </div>
            <p className="mt-4 text-2xl font-extrabold text-slate-900">제보 완료~!</p>
            <p className="mt-2 text-sm font-bold text-slate-500">소중한 제보 감사합니다. 메인페이지로 이동합니다.</p>
          </div>
        </div>
      ) : null}
    </Layout>
  );
}

