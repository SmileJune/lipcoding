# Curio — AI 웹 큐레이션 보드

> 흩어진 웹 정보를 **AI 요약 카드**로 모아 나만의 지식 **보드**로 정리하는 개인 생산성 웹 앱

링크 하나를 붙여넣으면 GitHub Copilot SDK가 페이지를 분석해 **제목·요약·핵심 포인트·태그**를 갖춘 카드로 만들어 줍니다. 사용자는 카드에 메모를 더하고 드래그앤드롭으로 자유롭게 배치하며 자기만의 큐레이션 보드를 완성합니다.

**🔗 라이브 데모: [app-curio-osnoy7.azurewebsites.net](https://app-curio-osnoy7.azurewebsites.net)**

---

## ✨ 핵심 가치

북마크는 *주소*만 저장하지만, Curio는 *요약 + 내 메모*를 저장합니다.

> **"북마크가 못 하는 건 저장한 걸 다시 안 본다는 것 — Curio는 안 열어봐도 기억나게 만든다."**

| 항목 | 기존 북마크 | Curio |
|------|-------------|-------|
| 저장되는 것 | 링크(주소)만 | 링크 + **AI 요약·핵심 포인트** |
| 다시 볼 때 | 페이지를 다시 열어야 함 | **카드만 봐도** 내용 회상 |
| 정리 방식 | 폴더 트리 | **자유 배치 보드**(드래그앤드롭) |
| 내 생각 | 못 남김 | 카드마다 **메모 추가** |
| 페이지가 사라지면 | 정보 소실(죽은 링크) | 요약이 남아 **가치 보존** |

---

## 🧩 주요 기능

- **링크 → 카드 생성** — URL 입력 시 본문을 추출해 AI 요약 카드를 자동 생성
- **AI 요약** — 제목·1줄 요약·핵심 포인트·추천 태그를 Copilot SDK로 생성
- **대표 이미지** — 페이지 `og:image` 썸네일 자동 표시
- **비주얼 보드** — `@dnd-kit` 기반 드래그앤드롭 배치, 카드 색상 변경
- **메모** — 각 카드에 자유 메모 추가
- **보드 관리** — 주제별 보드 생성·전환
- **AI 정리 도우미** — 카드들을 주제별로 묶는 그룹핑 제안
- **카드 Q&A** — 보드 내용 기반 자연어 질의응답
- **보드 공유** — 공유 링크로 보드를 읽기 전용으로 공개
- **로딩 UX** — 카드 생성 중 스켈레톤 자리표시로 즉각적인 피드백
- **GitHub 로그인** — GitHub OAuth 인증, 토큰 미설정 시 데모 모드로 동작

---

## 🛠 기술 스택

| 구분 | 기술 |
|------|------|
| 프론트엔드 | React + TypeScript + Vite, `@dnd-kit` |
| 백엔드 | Node.js + Express (TypeScript ESM) |
| 본문 추출 | `@mozilla/readability` + `jsdom` |
| AI | GitHub Copilot SDK (`@copilot-extensions/preview-sdk`) |
| 데이터 | 인메모리(개발) → Azure Cosmos DB(프로덕션, 키리스 RBAC) |
| 인증 | GitHub OAuth (`jose` JWT 세션) + 데모 폴백 |
| 배포 | Azure App Service(Linux) + Cosmos DB, `azd` |
| 테스트 | Vitest(단위·통합) + Playwright(E2E) |

> 단일 App Service에서 Express가 빌드된 React SPA와 `/api`를 함께 서빙합니다.

---

## 🚀 빠른 시작

### 사전 요구사항

- Node.js 20 이상
- (선택) Copilot 접근 권한이 있는 GitHub 토큰 — 미설정 시 **데모 폴백**으로 동작

### 1. 환경 변수 설정

```sh
cp .env.example .env
# .env 를 열어 GITHUB_TOKEN 등을 채웁니다 (gh auth token 으로 발급 가능)
```

### 2. 백엔드 (api)

```sh
cd api
npm install
npm run dev      # http://localhost:7071 에서 개발 서버 실행
```

### 3. 프론트엔드 (web)

```sh
cd web
npm install
npm run dev      # http://localhost:5173 에서 Vite 개발 서버 실행
```

> 프론트엔드는 `/api` 상대 경로로 백엔드를 호출합니다.

---

## ⚙️ 환경 변수

| 변수 | 설명 |
|------|------|
| `GITHUB_TOKEN` | Copilot SDK 인증 토큰. 미설정 시 데모 요약으로 폴백 |
| `PORT` | 백엔드 포트 (기본 `7071`) |
| `COSMOS_ENDPOINT` | 설정 시 Cosmos DB 사용, 미설정 시 인메모리 스토어 |
| `COSMOS_DATABASE` / `COSMOS_CONTAINER` | Cosmos 데이터베이스·컨테이너 이름 |
| `GITHUB_OAUTH_CLIENT_ID` / `GITHUB_OAUTH_CLIENT_SECRET` | GitHub OAuth 로그인 활성화 (미설정 시 데모 모드) |
| `SESSION_SECRET` | 세션 JWT 서명 시크릿 |
| `AZURE_ENV_NAME` / `AZURE_LOCATION` | `azd` 배포 환경 설정 |

비밀값은 반드시 `.env`(gitignore)에만 두고 커밋하지 않습니다.

---

## 🧪 테스트

외부 호출(Copilot·URL fetch)은 모킹하며, 데모 폴백 경로도 함께 검증합니다.

```sh
# 백엔드 단위·통합 테스트
cd api && npm test

# 프론트엔드 테스트
cd web && npm test

# 타입 체크 / OpenAPI 린트
npm run typecheck          # 각 패키지에서
npm run lint:api           # api 패키지에서 (redocly)
```

---

## 📡 API 개요

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `POST` | `/api/cards/from-url` | URL → 본문 추출 + AI 요약 → 카드 생성 |
| `GET` | `/api/cards?boardId=` | 카드 목록 조회 |
| `PATCH` | `/api/cards/:id` | 메모·위치·색상·태그 수정 |
| `DELETE` | `/api/cards/:id` | 카드 삭제 |
| `GET` / `POST` | `/api/boards` | 보드 목록 조회 / 생성 |
| `POST` | `/api/boards/:id/organize` | AI 정리 도우미(그룹핑 제안) |
| `POST` / `DELETE` | `/api/boards/:id/share` | 보드 공유 링크 생성 / 해제 |
| `GET` | `/api/shared/:shareId` | 공유 보드 읽기 전용 조회(공개) |
| `POST` | `/api/chat` | 카드/보드 기반 Q&A |
| `GET` | `/api/auth/me` · `/api/auth/login` · `/api/auth/callback` | GitHub OAuth 인증 |
| `GET` | `/api/health` | 상태 + Copilot/인증/스토어 모드 |

전체 명세는 [api/openapi.yaml](api/openapi.yaml) 참고.

---

## 🗂 프로젝트 구조

```
.
├── api/                 # 백엔드 (Express, TypeScript ESM)
│   ├── src/
│   │   ├── app.ts       # 라우트 정의
│   │   ├── service.ts   # 비즈니스 로직
│   │   ├── ai.ts        # Copilot SDK 연동 + 데모 폴백
│   │   ├── extract.ts   # 본문 추출 (readability + jsdom)
│   │   ├── ssrf.ts      # SSRF 방어 (사설 IP 차단)
│   │   ├── auth.ts      # GitHub OAuth + 세션
│   │   ├── memory-store.ts / cosmos-store.ts  # 스토어 구현
│   │   └── server.ts    # 진입점
│   ├── test/            # Vitest 테스트
│   └── openapi.yaml
├── web/                 # 프론트엔드 (React + Vite)
│   └── src/components/  # Board, CardItem, AiPanel, ShareBar 등
├── infra/               # Bicep IaC (App Service + Cosmos)
├── azure.yaml           # azd 설정
├── PROJECT.md           # 설계 기준 문서
└── LOG.md               # 작업 대화 로그
```

---

## ☁️ 배포 (Azure)

`azd`로 한 번에 프로비저닝·배포합니다. App Service(Linux) + Cosmos DB(serverless, 키리스 RBAC)로 구성됩니다.

```sh
azd auth login
azd up
```

패키징 단계에서 프론트(web)를 빌드해 `api/public`으로 복사하고, 백엔드를 `dist`로 컴파일한 뒤 App Service가 `node dist/server.js`로 기동합니다.

---

## 🔒 보안

- 외부 URL fetch 시 **SSRF 방지**(사설 IP 차단)와 본문 크기 제한
- 비밀값은 환경변수 / Azure Key Vault로 관리, 코드·커밋에 포함하지 않음
- Cosmos DB는 키 대신 **관리 ID 기반 RBAC**(키리스) 사용
- OWASP Top 10 준수

---

## 📚 문서

- **[PROJECT.md](PROJECT.md)** — 설계 기준 문서 (문제 정의·데이터 모델·아키텍처·로드맵)
- **[LOG.md](LOG.md)** — 작업 결정 누적 로그
