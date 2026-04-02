# 디자인 재현용 이미지 목록

기준: `html/` 원본 디자인에서 실제로 사용된 외부 이미지를 React 프로젝트 로컬 파일로 교체하기 위한 목록.

## 1) 음식/카드 이미지

- `food-main-01.jpg`
  - 원본: `https://images.unsplash.com/photo-1626071494702-4203bc46c841?...`
  - 사용처: 메인/상세/지갑 카드 대표 이미지

- `food-main-02.jpg`
  - 원본: `https://images.unsplash.com/photo-1552611052-33e04de081de?...`
  - 사용처: 메인/프로필/지갑 카드 보조 이미지

- `food-main-03.jpg`
  - 원본: `https://images.unsplash.com/photo-1617196034183-421b4917c92d?...`
  - 사용처: 메인/지갑 카드 보조 이미지

- `food-main-04.jpg`
  - 원본: `https://images.unsplash.com/photo-1551024601-bec78aea704b?...`
  - 사용처: 메인 카드(간식/베이커리)

## 2) 프로필 아바타 이미지

- `avatar-default.svg`
  - 원본: `https://api.dicebear.com/7.x/avataaars/svg?seed=Lucky`
  - 사용처: 공통 헤더 프로필

- `avatar-profile.svg`
  - 원본: `https://api.dicebear.com/7.x/avataaars/svg?seed=deokki`
  - 사용처: 내 프로필 페이지 프로필 카드

- `avatar-settings.svg`
  - 원본: `https://api.dicebear.com/7.x/avataaars/svg?seed=Ducky`
  - 사용처: 환경설정 페이지 프로필

## 권장 저장 위치

- `wallet-react/public/images/food/*`
- `wallet-react/public/images/avatar/*`

## 교체 규칙

- React JSX에서 외부 URL 대신 `/images/...` 상대경로 사용
- 외부 URL 파라미터(`?auto=format...`) 없이 로컬 최적화 파일(WebP/JPG) 사용

## 지도(Kakao) 연동 예정 영역

- 메인 지도: `id="kakao-map-main"`
- 상세 지도: `id="kakao-map-detail"`

현재 위 두 영역은 의도적으로 빈 컨테이너 상태이며, 카카오맵 SDK 연결 시점에 초기화 코드만 붙이면 됨.

