export const KAKAO_MAP_KEY = import.meta.env.VITE_KAKAO_JS_KEY;

export function loadKakaoMapScript(onLoad, onError) {
  const scriptId = 'kakao-map-sdk';
  const existingScript = document.getElementById(scriptId);

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
  script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_KEY}&libraries=services,clusterer,drawing&autoload=false`;
  script.addEventListener('load', onLoad);
  script.addEventListener('error', onError);
  document.head.appendChild(script);

  return () => {
    script.removeEventListener('load', onLoad);
    script.removeEventListener('error', onError);
  };
}
