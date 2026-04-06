export const KAKAO_MAP_KEY = import.meta.env.VITE_KAKAO_JS_KEY;

export function loadKakaoMapScript(onLoad, onError) {
  const scriptId = 'kakao-map-sdk';
  let existingScript = document.getElementById(scriptId);

  if (existingScript) {
    // 이미 로드된 스크립트는 load 이벤트가 다시 오지 않으므로 즉시 실행 보장
    if (window.kakao?.maps) {
      onLoad?.();
      return () => {};
    }
    // 이전 로드가 실패한 스크립트면 제거 후 재시도
    if (existingScript.dataset.loadState === 'error') {
      existingScript.remove();
      existingScript = null;
    }
  }

  if (existingScript) {
    existingScript.addEventListener('load', onLoad);
    existingScript.addEventListener('error', onError);
    return () => {
      existingScript.removeEventListener('load', onLoad);
      existingScript.removeEventListener('error', onError);
    };
  }

  const script = document.createElement('script');
  script.id = scriptId;
  script.async = true;
  script.dataset.loadState = 'loading';
  script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_KEY}&libraries=services,clusterer,drawing&autoload=false`;
  const handleLoad = () => {
    script.dataset.loadState = 'loaded';
    onLoad?.();
  };
  const handleError = () => {
    script.dataset.loadState = 'error';
    onError?.();
  };
  script.addEventListener('load', handleLoad);
  script.addEventListener('error', handleError);
  document.head.appendChild(script);

  return () => {
    script.removeEventListener('load', handleLoad);
    script.removeEventListener('error', handleError);
  };
}
