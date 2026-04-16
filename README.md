# 지갑지키미 (SaveMoney / Wallet Keeper)

가성비 식당을 지도에서 찾고, 리뷰/사진을 남기고, 북마크로 저장하는 웹 서비스입니다.  
운영 배포(EC2+Nginx)와 로컬 개발(React+Spring Boot)까지 포함합니다.

---

## 구성

- **프론트엔드**: `wallet-react/` (React + Vite)
- **백엔드(API)**: `workspace/poormoney/` (Spring Boot 3 / Java 21 / JPA)
- **DB**: MariaDB (운영은 EC2 로컬 DB 구성)
- **웹서버**: Nginx (정적 서빙 + API reverse proxy)

---

## 운영 주소

- **프론트**: `https://지갑지키미.store` (`https://www.지갑지키미.store`)
- **API**: `https://api.지갑지키미.store`
- **Health**: `GET /api/health`

> 한글 도메인은 punycode로도 접근 가능합니다. 운영/인증서 발급 시 punycode가 안전합니다.

---

## 주요 기능

- **지도 기반 식당 탐색** (카카오 지도)
- **식당 제보(등록) → 관리자 승인 → 지도 반영**
- **댓글/리뷰 + 사진 첨부**
- **북마크(내 지갑) 저장**
- **관리자 콘솔**
  - 제보 승인/반려/삭제
  - 사용자 정지/해제(사유 포함)
- **정지 해제 요청**

---

## 로컬 개발 실행

### 1) 백엔드 (Spring Boot)

경로: `workspace/poormoney/`

1. MariaDB 실행 후 DB `test` 준비 (없으면 생성)
2. 필요 시 `sql/ddl_user_badges.sql` 실행 (프로젝트 설정에 따라)
3. `application-local.properties.example` → `application-local.properties`로 복사 후 값 입력
4. `local` 프로필로 실행

참고 파일: `workspace/poormoney/로컬실행.txt`

### 2) 프론트 (Vite)

경로: `wallet-react/`

```bash
npm install
npm run dev
```

환경변수:
- 개발: `.env.development`의 `VITE_API_BASE_URL`
- 카카오 지도: `VITE_KAKAO_JS_KEY`

---

## 운영 배포(수동) 절차

현재는 **수동 배포** 방식입니다. (EC2에 접속해서 직접 명령 실행)

### 로컬에서

```bash
git status
git add .
git commit -m "message"
git push origin main
```

### EC2에서 (프론트 배포)

```bash
cd ~/app-src
git pull

cd ~/app-src/wallet-react
npm ci
npm run build
sudo rsync -av --delete dist/ /var/www/wallet-react/
sudo nginx -t
sudo systemctl reload nginx
```

### 운영 확인

```bash
curl -I https://지갑지키미.store
curl -i https://api.지갑지키미.store/api/health
```

---

## 운영 서버(EC2) 주요 경로

- 소스: `~/app-src`
- 프론트 배포 파일: `/var/www/wallet-react`
- 백엔드 앱: `/opt/poormoney/app.jar`
- 백엔드 환경변수: `/opt/poormoney/.env`
- systemd: `/etc/systemd/system/poormoney.service`
- nginx:
  - API: `/etc/nginx/sites-available/poormoney-api`
  - Web: `/etc/nginx/sites-available/poormoney-web`

---

## 트러블슈팅

### CORS 오류가 날 때

백엔드 `.env`에 허용 Origin을 추가/수정 후 재시작:

```bash
sudo nano /opt/poormoney/.env
sudo systemctl restart poormoney
```

### 한글 도메인/인증서 발급 문제

- `dig`/`certbot` 실행 시 punycode를 사용
- Python IDNA 변환으로 오타 방지 권장

### 모바일 사진 첨부 실패

- 기기 설정/사진 포맷(HEIC/HEIF) 영향이 있을 수 있음
- 앱에서 리사이징/에러 메시지를 통해 안내

---

## AdSense

소유권 확인용 메타 태그가 `wallet-react/index.html`에 적용되어 있습니다:

```html
<meta name="google-adsense-account" content="ca-pub-9006377300065588" />
```

배포 후 AdSense에서 “확인”을 진행합니다.

