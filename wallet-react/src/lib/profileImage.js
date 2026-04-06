/**
 * 프로필용 data URL (JPEG). localStorage 용량·헤더 로딩을 위해 축소·압축.
 */
export function fileToProfileDataUrl(file, maxSide = 512, quality = 0.88) {
  return new Promise((resolve, reject) => {
    const ext = (file?.name?.split('.').pop() || '').toLowerCase();
    const mime = String(file?.type || '').toLowerCase();
    if (mime.includes('heic') || mime.includes('heif') || ext === 'heic' || ext === 'heif') {
      reject(new Error('HEIC/HEIF 사진은 변환에 실패할 수 있습니다. JPG/PNG로 다시 시도해 주세요.'));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        let currentMaxSide = Math.max(256, Number(maxSide) || 512);
        let currentQuality = Math.min(0.92, Math.max(0.6, Number(quality) || 0.88));

        for (let i = 0; i < 4; i += 1) {
          const scale = Math.min(1, currentMaxSide / Math.max(img.width, img.height, 1));
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          try {
            ctx.drawImage(img, 0, 0, w, h);
            const out = canvas.toDataURL('image/jpeg', currentQuality);
            if (out && out.length > 128) {
              resolve(out);
              return;
            }
          } catch {
            // 모바일 메모리 이슈 가능: 더 작은 해상도/품질로 재시도
          }
          currentMaxSide = Math.max(256, Math.floor(currentMaxSide * 0.75));
          currentQuality = Math.max(0.6, currentQuality - 0.08);
        }
        reject(new Error('사진을 처리하지 못했습니다. 용량이 작은 JPG/PNG로 다시 시도해 주세요.'));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('이미지를 불러올 수 없습니다.'));
    };
    img.src = url;
  });
}
