# 달리모 관리 웹

회원 조회 · 이용 정지, 코스 신고 처리를 하는 운영자용 웹 (`frontend/docs/ui/FOUNDATION-DECISION-LOG.md` 85항).
서버 API는 `backend/README.md` "관리 웹" · "코스 신고 처리".

## 로그인

앱과 같은 달리모 계정으로 로그인한다. 서버 환경변수 `ADMIN_EMAILS`에 그 이메일이 있어야 들어온다.

1. 앱에서 관리자로 쓸 이메일로 가입한다.
2. 서버 `.env`에 `ADMIN_EMAILS=그 이메일`을 넣고 서버를 다시 띄운다.
3. 관리 웹에서 그 계정으로 로그인한다.

토큰은 브라우저 탭에만 남는다(`sessionStorage`). 탭을 닫으면 로그아웃된다.

## 개발

```bash
cd admin
npm install
cp .env.example .env.local   # VITE_API_URL=http://localhost:8080
npm run dev                  # http://localhost:5174
```

개발 서버(`application-dev.yaml`)는 `admin@dallimo.dev`가 관리자이고 CORS에 `http://localhost:5174`가 들어 있다. 앱이나 `POST /api/v1/auth/signup`으로 이 이메일을 가입하면 된다.

## 배포 (Netlify)

1. Netlify에서 새 사이트를 만들고 이 저장소를 고른다.
2. **Base directory**를 `admin`으로 둔다. 빌드 명령 · 배포 폴더 · 서버 주소는 `admin/netlify.toml`에 있다.
3. 서버 `.env`에 아래를 넣고 서버를 다시 띄운다.
   - `ADMIN_EMAILS=관리자 이메일`
   - `CORS_ALLOWED_ORIGINS=http://localhost:8081,https://{관리 웹 주소}`

검색 엔진에 나오지 않게 `noindex` 헤더와 `robots.txt`를 둔다. 주소는 해시(`#/users`)라 새로 고침해도 그대로 열린다.

## 화면

| 주소 | 화면 |
| --- | --- |
| `#/users` | 회원 목록 · 검색(회원 id · 이메일 · 닉네임) · 상태 거르기 |
| `#/users/{id}` | 회원 상세: 계정 · 로그인 기기 · 최근 달리기(인증 결과 · 실패 사유) · 만든 코스 · 신고 · 조치 기록, 이용 정지 · 해제 |
| `#/reports` | 코스 신고 처리: 검토 대기 · 숨김 · 차단 |
| `#/reports/{id}` | 신고 검토: 경로 · 만든 회원 · 신고 · 처리 기록, 숨기기 · 차단 · 다시 공개 |

조치(정지 · 해제 · 코스 처리)는 사유와 함께 서버 조치 기록에 남는다. 달리기 경로(GPS)는 보여 주지 않는다.
