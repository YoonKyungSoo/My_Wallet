# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


erDiagram
  사용자 ||--o{ 북마크 : 저장
  사용자 ||--o{ 댓글 : 작성
  사용자 ||--o{ 식당제보 : 제보
  사용자 ||--o{ 댓글신고 : 신고
  사용자 ||--o{ 버그제보 : 제보
  사용자 ||--o{ 정지해제요청 : 요청
  사용자 ||--o{ 활동이벤트 : 활동
  사용자 ||--o{ 사용자뱃지 : 획득
  사용자 ||--o{ 공지 : 수정

  뱃지 ||--o{ 사용자뱃지 : 부여

  식당 ||--o{ 댓글 : 댓글
  식당 ||--o{ 북마크 : 북마크
  식당 ||--o{ 식당사진 : 사진
  식당 ||--o{ 식당숨김사진 : 숨김
  식당 ||--o{ 식당제보 : 승인결과

  댓글 ||--o{ 댓글사진 : 첨부
  댓글 ||--o{ 댓글신고 : 신고대상

  사용자 {
    bigint 사용자식별자 PK
    string 로그인아이디 UQ
    string 비밀번호해시
    string 닉네임 UQ
    string 자기소개
    string 프로필이미지주소
    string 역할 "일반/관리자"
    boolean 정지여부
    string 정지사유
    datetime 생성일시
  }

  뱃지 {
    bigint 뱃지식별자 PK
    string 뱃지코드 UQ
    string 뱃지이름
    string 뱃지아이콘
    int 단계
    datetime 생성일시
  }

  사용자뱃지 {
    bigint 사용자뱃지식별자 PK
    bigint 사용자식별자 FK
    bigint 뱃지식별자 FK
    datetime 부여일시
    string 부여근거 "선택"
  }

  식당 {
    bigint 식당식별자 PK
    string 식당명
    string 카테고리
    string 주소
    string 전화번호
    decimal 기본평점 "초기/외부값"
    string 대표메뉴명
    string 메뉴가격표시문구
    json 메뉴가격목록 "숫자 배열"
    datetime 생성일시
  }

  식당사진 {
    bigint 식당사진식별자 PK
    bigint 식당식별자 FK
    string 사진주소
    int 정렬순서
    datetime 생성일시
  }

  댓글 {
    bigint 댓글식별자 PK
    bigint 식당식별자 FK
    bigint 사용자식별자 FK
    int 별점 "1~5"
    string 내용
    string 닉네임스냅샷
    string 별명스냅샷
    datetime 생성일시
  }

  댓글사진 {
    bigint 댓글사진식별자 PK
    bigint 댓글식별자 FK
    string 사진주소
    int 정렬순서
  }

  북마크 {
    bigint 북마크식별자 PK
    bigint 사용자식별자 FK
    bigint 식당식별자 FK
    datetime 생성일시
  }

  식당제보 {
    bigint 식당제보식별자 PK
    bigint 제보자사용자식별자 FK
    string 식당명
    string 주소
    string 카테고리라벨
    string 메뉴명
    string 메뉴가격텍스트
    int 별점
    json 사진목록 "URL 배열"
    string 상태 "대기/승인/반려"
    datetime 생성일시
    datetime 처리일시
    bigint 승인된식당식별자 FK "승인 시"
    bigint 처리자사용자식별자 FK "관리자"
    string 처리메모
  }

  댓글신고 {
    bigint 댓글신고식별자 PK
    bigint 신고자사용자식별자 FK
    bigint 댓글식별자 FK
    string 신고사유
    string 상태 "대기/처리/반려"
    datetime 생성일시
    datetime 처리일시
    bigint 처리자사용자식별자 FK "관리자"
  }

  버그제보 {
    bigint 버그제보식별자 PK
    bigint 제보자사용자식별자 FK
    string 식당명스냅샷
    string 주소스냅샷
    string 내용
    json 사진목록 "URL 배열"
    string 상태 "대기/처리"
    datetime 생성일시
    datetime 처리일시
    bigint 처리자사용자식별자 FK "관리자"
  }

  정지해제요청 {
    bigint 정지해제요청식별자 PK
    bigint 사용자식별자 FK
    string 상태 "대기/승인/거절"
    datetime 생성일시
    datetime 처리일시
    bigint 처리자사용자식별자 FK "관리자"
  }

  공지 {
    bigint 공지식별자 PK
    string 본문
    boolean 노출여부
    datetime 수정일시
    bigint 수정자사용자식별자 FK
  }

  활동이벤트 {
    bigint 활동이벤트식별자 PK
    bigint 사용자식별자 FK
    string 종류 "댓글/제보/저장/기타"
    json 페이로드
    datetime 생성일시
  }

  식당숨김사진 {
    bigint 식당숨김사진식별자 PK
    bigint 식당식별자 FK
    string 사진주소
    bigint 처리자사용자식별자 FK "관리자"
    datetime 생성일시
  }
