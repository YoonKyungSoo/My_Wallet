import { useState } from 'react';

export default function ImageWithFallback({ src, alt, className = '' }) {
  const [failed, setFailed] = useState(!src);

  if (failed) {
    return (
      <div
        className={`bg-slate-100 text-slate-500 text-sm font-bold flex items-center justify-center ${className}`}
      >
        등록된 사진이 없습니다
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

