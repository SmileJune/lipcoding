# Curio 프로젝트 — 대화 로그

> 이 문서는 프로젝트 진행 중의 **질문(Q)·답변(A)·결정사항**을 요약해 기록합니다.
> 최신 항목이 아래에 추가됩니다. (작성: 자동 누적)

---

## 2026-06-20

### 1. 프로젝트 시작
- **Q**: 개인 생산성 향상 웹 앱을 만들 것. 조건 — Copilot SDK 사용, Azure 배포, AI 심사위원 7명이 심사. 내용을 먼저 md로 작성.
- **A / 결정**: 프로젝트 개요 `PROJECT.md` 작성 (기술스택·기능·배포·심사기준 정리).

### 2. 진행 방식
- **Q**: 키보드를 사용할 수 없으니 승인 조건을 여유롭게.
- **A / 결정**: 확인 질문 최소화, 결정·실행은 에이전트가 자율 처리. 질문은 음성으로 답하기 쉬운 객관식 위주.
- **보충**: 키보드 불가 = 타이핑 불가이며, **음성 입력·제출은 가능**.

### 3. 앱 종류 탐색
- **Q**: 웹으로 제공되는 개인 생산성 앱 종류는? 먼저 어떤 종류인지 알고 싶음.
- **A**: 카테고리 정리 — 할 일 관리 / 노트·지식관리(PKM) / 캘린더 / 프로젝트·협업 / 시간관리·집중 / 습관 / 저널 / 읽을거리 저장 / 목표·OKR / AI 통합 워크스페이스.
- **결정**: 아직 미정 → 스캐폴드 코드·todo 전부 삭제(`PROJECT.md`만 유지).

### 4. 아이디어 검증
- **Q**: 링크 입력 또는 크롬 확장 클릭 → 페이지 요약 카드 생성 → 카드에 메모·드래그앤드롭으로 꾸미기. 이것도 생산성 앱인가?
- **A**: 그렇다. **AI 웹 클리퍼 + 비주얼 보드(PKM)** 에 해당. 웹클리퍼(Pocket)·AI요약(Readwise)·비주얼정리(Milanote·Heptabase) 결합. Copilot SDK 활용도·실용성·UX에서 심사에 유리.

### 5. 설계 문서 작성
- **Q**: 해당 아이디어로 설계 문서부터 작업.
- **A / 결정**: 앱 이름 **Curio** 확정. `PROJECT.md` 를 Curio 설계 문서로 교체.
  - 본문 추출 `@mozilla/readability + jsdom`, 드래그앤드롭 `@dnd-kit` 채택.
  - 크롬 확장은 2차로 미루고 **링크 입력 웹 앱**을 MVP로.
  - 15개 섹션(문제정의·기능·UI·데이터모델·아키텍처·API·Copilot활용·Azure배포·로드맵·심사대응 등) + mermaid 다이어그램 포함.

### 6. 차별점 정리
- **Q**: 기존 북마크와의 차별점은?
- **A**: ① 포인터가 아닌 "요약+메모(지식)" 저장 → 다시 안 열어도 됨 ② 읽기→생각→연결 한 흐름(능동 정리) ③ 공간적·시각적 큐레이션(폴더 아닌 캔버스). 경쟁 도구는 부분적으로 존재하나 "AI요약+자유보드+메모"를 Copilot SDK로 묶는 게 핵심.
- **결정**: `PROJECT.md` 에 "1-A. 기존 북마크와의 차별점" 섹션 추가.

### 7. 로그 기록 시작
- **Q**: 지금부터 모든 질문·답변을 요약해 로그 md로 남겨 나중에 볼 수 있게.
- **A / 결정**: 본 문서 `LOG.md` 생성. 이후 모든 Q&A·결정을 여기에 누적 기록.

---

### 8. 개발 환경 점검 (2026-06-20)
- **Q**: 프롬프트 반복 작성·제출 예정. 환경설정 확인하고 개발 도구 전부 설치. MCP·skill 필요 여부 확인.
- **A / 결과**:
  - ✅ 설치 완료: Node 22 / npm 10 / az 2.87 / azd 1.25 / func 4.12 / swa 2.0.9 / gh 2.94 / git / brew
  - ✅ **Copilot SDK 실제 동작 확인** — gh 토큰으로 LIVE 응답 수신(데모 아님)
  - ✅ MCP 연결됨: Azure / GitHub / Microsoft Learn / Playwright / Serena, microsoft-foundry skill
  - ⚠️ **Azure 미로그인** — 배포 단계에서만 필요, 개발에는 무관. 브라우저 클릭으로 로그인(타이핑 불필요)
- **결정 대기**: Azure 로그인 지금 vs 배포 시점

### 9. Azure 로그인 완료 (2026-06-20)
- **결정**: 지금 바로 로그인 진행.
- **결과**: `az` + `azd` 모두 디바이스 코드 방식으로 로그인 완료.
  - 계정: `godhkekf24@inha.edu` / 테넌트: `inha.edu` (inha0.onmicrosoft.com)
  - 구독: "Azure subscription 1" (`983df9cc-…`), 상태 Enabled
- **상태**: ✅ 개발·배포 환경 100% 준비 완료. 이제 코드 작성 단계로 진입 가능.

### 10. 음성 입력 언어 변경 (2026-06-20)
- **Q**: 음성 입력이 자꾸 영어로 입력되는데 한국어로 바꿔줘.
- **A / 결정**: VS Code Speech 설정 `accessibility.voice.speechLanguage` 를 `ko-KR` 로 변경(사용자 `settings.json`).
- **후속**: 사용자가 해당 변경을 되돌림(undo) → 현재 설정 **미적용** 상태.

### 11. 빈 파일 점검 (2026-06-20)
- **Q**: 기존 프로젝트에 적용된 빈(엠티) 파일들을 모두 확인.
- **A / 결과**: 작업 디렉터리에 `.git` 만 존재, 추적 파일·커밋 없음 → **빈 파일 0개**.

### 12. 재확인 (2026-06-20)
- **Q**: 다시 확인해줘.
- **A / 결과**: `PROJECT.md`(12,263B)·`LOG.md`(4,468B) 새로 생성 확인. 둘 다 내용 있음 → **빈 파일 여전히 0개**. (Git 미추적 상태)

### 13. 문서 역할 정의 (2026-06-20)
- **Q**: `PROJECT.md` 는 설계 문서, `LOG.md` 에는 모든 질문·대화 요약을 로그처럼 기록.
- **A / 결정**: 역할 확정 — **`PROJECT.md` = 설계 문서**, **`LOG.md` = 대화 로그(전체 Q&A 누적)**. 본 항목까지 반영해 로그 갱신.

### 14. 프로젝트 기준 확정 (2026-06-20)
- **Q**: 작업 기준 재정의 — ① Q&A 요약을 md로 정리 ② GitHub Copilot Max·Azure 최대 활용 ③ 입코딩 도구 전부 설치(MCP·skill 확인) ④ 필요한 환경변수 사전 저장 ⑤ 모든 코드에 테스트 작성·실행 검증 필수. + Copilot SDK 사용, Azure 배포.
- **A / 결정**:
  - 표준 문서 `.github/copilot-instructions.md` 신설(작업자 제약·필수 규칙 6개·기술스택·테스트 규약·보안).
  - 도구 점검: ✅ Node22 / npm10 / az / azd1.25 / func4.12 / swa2.0.9 / git / gh2.95 설치, Azure 로그인됨. ⚠️ `gh` 로그아웃 → Copilot LIVE 토큰 재발급 필요(개발은 데모 폴백 가능).
  - MCP: Azure · GitHub · Microsoft Learn · Playwright(E2E) 사용 가능. Skill: `azure-hosted-copilot-sdk` · `azure-prepare` · `azure-deploy` · `azure-validate` · `cosmosdb-best-practices` 관련.
  - 환경변수: `.env`(gitignore) · `.env.example` 생성. Azure 구독/테넌트 ID 사전 저장, 기존 `OPENAI_API_KEY` 보존, `GITHUB_TOKEN` 슬롯 추가. `.env` 커밋 차단 검증 완료.
  - 테스트 규약: **Vitest**(단위·통합) + **Playwright**(E2E), 데모 폴백 경로 포함, `npm test` 전체 통과 후 완료 처리.
- **보안 알림**: `.env` 에 실제 OpenAI 키 존재 → 커밋 금지(.gitignore 적용 완료). 노출 이력 있으면 키 회전 권장.

### 15. gh 로그인·Copilot LIVE 확정 (2026-06-20)
- **Q**: gh 로그인 해결됐어?
- **A / 결과**: 브라우저 디바이스 코드 방식으로 `gh auth login` 완료 → 계정 **SmileJune** 로그인.
  - `gh auth token`(`gho_`, 40자)을 `.env` 의 `GITHUB_TOKEN` 에 저장(값 미출력), `.env` 커밋 차단 유지 확인.
  - Copilot SDK(`@copilot-extensions/preview-sdk`) 임시 LIVE 테스트 → 응답 **`CURIO_LIVE_OK`** 수신. ✅ Copilot LIVE 정상.

### 16. MVP 설계 재검토 (2026-06-20)
- **Q**: MVP 설계가 잘 되어 있는지 다시 확인.
- **A / 결과**: 전반적으로 견고 — 가치제안·데이터모델·REST API·데모폴백·단계 로드맵이 일관됨. 보완점 4가지 식별:
  - ① 카드 "크기 변경"이 데이터모델에 size 필드 없음 → MVP에서 리사이즈 제외(색상+자유배치 유지) 또는 width/height 추가 필요.
  - ② `status` 필드 값 미정의 → ready/loading/error 정의 또는 클라이언트 전용 처리.
  - ③ `imageUrl` 필드는 있으나 썸네일은 2차 기능 → 필드 예약으로 유지(문제 없음).
  - ④ 보드 rename/delete API·태그 필터 API 부재 → MVP는 클라이언트 필터/기본보드로 충분, 필요 시 추가.
- **결정 대기**: 보완점 반영 후 스캐폴드 vs 현 설계로 바로 진행.

### 17. 옵션1 진행 + API 명세 작성 (2026-06-20)
- **Q**: 1번으로 진행(리사이즈 제외) + API 문서부터 작성.
- **A / 결과**:
  - PROJECT.md 보완: 카드 리사이즈 → 2차로 이동, `status` 값(ready/summarizing/error) 정의, `imageUrl` 예약 명시(데이터모델 일관성 확보).
  - `api/openapi.yaml` 신설 — OpenAPI 3.1, 9개 엔드포인트(cards/boards/chat/health) + 스키마(Card·Board·요청/응답·Error) 정의.
  - `redocly.yaml` 추가(security-defined off = MVP 무인증 명시).
  - 검증: `npx @redocly/cli lint` → **valid 🎉 (exit 0, 경고 4건 비차단)**.
- **결정**: 다음은 백엔드 스캐폴드(명세 기반 Functions + 인메모리 스토어 + 헬스/카드 API + Vitest 테스트).

### 18. 핵심 기능(백엔드) 구현 + 테스트 + 커밋 (2026-06-20)
- **Q**: 핵심 기능 구현 + 테스트까지 + 구현 후 기능단위 커밋.
- **A / 결과**:
  - 백엔드(`api/`, TypeScript ESM) 구현 — 모듈: `types`·`store`(인메모리)·`ssrf`·`extract`(readability+jsdom)·`ai`(Copilot 요약/정리/Q&A + 데모 폴백)·`service`·`app`(Express)·`server`.
  - 9개 엔드포인트 전부 구현(명세 일치): health, cards/from-url, cards CRUD, boards, organize, chat.
  - 테스트: **Vitest 57개 전부 통과** (6파일: ssrf·store·ai·extract·service·app[supertest]). 데모 폴백·SSRF·검증 경로 포함.
  - 품질: `tsc --strict` 타입체크 통과(에러 0).
  - 스모크: 실서버 부팅(copilot:live), 실제 URL→**LIVE 한국어 요약 카드** 생성 확인.
  - 커밋: 기능 단위 7개(chore/docs/feat). `.env`·OpenAI 키 미커밋 검증 완료.
- **다음 단계**: 프론트엔드(React+TS+Vite) — 링크 입력→카드→드래그앤드롭 보드, 또는 Azure 배포 준비.

### 19. MCP 자율 설치·사용 허용 (2026-06-20)
- **Q**: 필요한 MCP 가 있으면 언제든 설치 후 사용해.
- **A / 결정**: MCP·도구를 **자율 설치·사용** 허용(매번 확인 불필요). `.github/copilot-instructions.md` 작업자 제약에 반영. 현재 연결됨: Azure · GitHub · Microsoft Learn · Playwright(E2E). 새 도구가 필요해지면 설치 후 결과만 보고.

### 20. 프론트엔드(화면) 구현 + 테스트 (2026-06-20)
- **Q**: 화면 먼저 만들어줘.
- **A / 결과**:
  - 프론트엔드 `web/`(React+TS+Vite) 구현 — 사이드바(보드·AI도우미·Copilot 배지), 링크 입력→카드 생성, `@dnd-kit` 드래그 보드, 카드(요약·핵심·태그·메모·색상·삭제), AI 정리/Q&A 패널.
  - API 클라이언트(상대경로 /api, dev 프록시), 데이터 모델 백엔드와 일치.
  - 테스트: **Vitest 18개 통과**(api·dnd·LinkInput·CardItem·App 통합[Testing Library]). 타입체크 + 프로덕션 빌드 통과.
  - **브라우저 E2E 확인**(Playwright): 링크 입력→실제 Copilot LIVE 요약 카드 렌더까지 시각 확인.
  - 커밋: 기능 단위 4개(chore/feat). 임시 스크린샷·.playwright-mcp 는 gitignore.
- **다음 단계**: Azure 배포(`azd`: SWA+Functions+Cosmos), Cosmos 영속화, Playwright 자동화 E2E 보강.

### 21. 카드 대표 이미지(썸네일) 추가 (2026-06-20)
- **Q**: 카드 생성 시 이미지도 가져와야 함. 어떤 메타 태그를 가장 많이 쓰는지 확인하고 구현.
- **A / 결과**:
  - 가장 널리 쓰이는 표준은 **og:image**(Open Graph), 다음이 **twitter:image**(Twitter Card).
  - 백엔드 `extract.ts`: `og:image → twitter:image → link[rel=image_src]` 순 탐색, 상대경로 절대화, http/https만 허용. `Article.imageUrl` 반환→카드 저장.
  - 프론트 `CardItem`: 썸네일 렌더(onError 시 숨김) + 스타일.
  - 테스트: 백엔드 +3(og/twitter/null), 프론트 +2 → 백엔드 60·프론트 20 전부 통과. 타입체크·빌드 통과.
  - 실제 검증: Wikipedia 페이지에서 og:image 절대 URL 추출 확인.
  - `imageUrl` 2차 예약 → **MVP 기능**으로 승격(PROJECT.md 반영).
- **다음 단계**: Azure 배포 또는 Cosmos 영속화.

### 22. Azure 배포 계획 — 리소스 정리 + IaC 선택 (2026-06-20)
- **Q**: Azure 처음 사용. 어떤 리소스가 필요한지 정리하고 Terraform 사용 필요 여부도 확인.
- **A / 결정**:
  - 권장 구성: **Static Web Apps(프론트) + Azure Functions(백엔드 API, Consumption) + Cosmos DB(Serverless NoSQL)** + (선택) Key Vault(GITHUB_TOKEN)·App Insights. Resource Group 1개.
  - 코드 작업 1가지: Express → Azure Functions 어댑터(service.ts 분리돼 소규모) 또는 Container Apps 컨테이너화.
  - **IaC: azd + Bicep 권장, Terraform 불필요.** 초보 친화·`azd up` 단일 명령·MS 네이티브·계획 일치. Terraform은 멀티클라우드/조직표준 시에만.
  - 비용: 데모 수준 거의 무료(SWA Free·Functions Consumption 무료한도·Cosmos Serverless 소액).
- **다음 단계**: azd 스캐폴드(azure.yaml + infra Bicep) → 검증 → `azd up`.

### 23. Telegram 완료 알림 설정 (2026-06-20)
- **Q**: `~/programming` 의 텔레그램 관련 env 파일을 찾고, 작업 완료 시 텔레그램 메시지를 보내도록 설정.
- **A / 결과**:
  - 기존 컨벤션 발견: 여러 프로젝트의 `.env.codex-notify`(TELEGRAM_BOT_TOKEN/CHAT_ID) + `scripts/codex-notify.mjs`.
  - 동일 패턴 복제: `scripts/codex-notify.mjs`(PROJECT_NAME=curio) + `scripts/test-codex-notify.js` + `.env.codex-notify.example`.
  - 시크릿은 기존 프로젝트에서 **출력 없이 복사**, `.env.codex-notify` gitignore 처리(미커밋 확인).
  - 검증: 테스트 **3/3 통과**, **실제 텔레그램 전송 성공**.
  - 표준화: `.github/copilot-instructions.md` 에 "완료 알림" 규칙 추가 + 메모리 기록.
- **사용법**: `node scripts/codex-notify.mjs done "<요약>"` (실패 시 `failed`).

### 24. Azure 배포 준비 — Cosmos 포함 + 검증 (2026-06-20)
- **Q**: "엑스모스 DB 를 포함해서 배포 준비해줘" — Cosmos DB 까지 포함한 Azure 배포를 준비.
- **A / 결정**:
  - **아키텍처**: 단일 App Service(Linux B1, Node 20)가 Express 로 빌드된 React SPA(`api/public`) + `/api` 를 함께 서빙. Functions 재작성 없이 기존 Express 재사용. (대안 SWA+Functions 대비 단순)
  - **스토어 비동기 리팩터**: `Store` 인터페이스 비동기화 → `memory-store`(로컬·테스트) / `cosmos-store`(`@azure/cosmos`, 키리스 관리 ID). `COSMOS_ENDPOINT` 설정 시 자동 전환, 미설정 시 인메모리 폴백. service/app/server 비동기화.
  - **정적 SPA 서빙**: `express.static(public)` + 비 `/api` GET → `index.html` 폴백, `trust proxy`/`0.0.0.0`/health. (폴백 테스트 추가)
  - **IaC**: `azure.yaml`(azd, prepackage 훅으로 web 빌드→api/public) + `infra/`(Bicep: RG, Log Analytics, App Insights, Cosmos serverless `cards`/`boards`, App Service, **Cosmos Data Contributor RBAC→Web App 관리 ID**).
  - **검증(azure-validate 통과)**: azd 1.25.6 · bicep 컴파일 · `azd provision --preview` SUCCESS(6 리소스) · `azd package` SUCCESS(zip 에 SPA+dist+src, node_modules 제외) · RBAC 키리스 · 로컬 프로덕션 형태(`node dist/server.js`) /api·SPA 동작 확인.
  - **테스트**: 백엔드 **62** + 프론트 **20** = **82개 통과**.
  - **환경**: azd env `curio`(구독 `Azure subscription 1`, 위치 `koreacentral`), `GITHUB_TOKEN` 설정(출력 없이).
  - 계획서 `.azure/deployment-plan.md` Status → **Validated**. 남은 단계: 사용자 승인 후 `azd up`(azure-deploy).

### 25. 사용자 인증 설계 + GitHub OAuth 결정 (2026-06-20)
- **Q**: "사용자 인증부터 설계해줘" → 어떤 로그인 방식으로 구현할지.
- **A / 결정**: **GitHub OAuth**(객관식에서 사용자 선택). 앱이 GitHub 중심이라 자연스럽고 로컬·테스트 용이.
  - **세션**: 서버 발급 **서명 JWT(jose)** 를 httpOnly·secure·sameSite=lax 쿠키에 저장(상태 비저장 → Cosmos/인메모리 동일).
  - **데모 폴백**(Copilot 패턴 동일): OAuth env 미설정 시 **데모 사용자 자동 로그인** → 로컬 항상 동작. `/api/health` 에 `authMode: live|demo`.
  - **데이터 격리**: `users` 컨테이너 신설 + `Board`/`Card` 에 `ownerId` 추가, 모든 스토어 조회를 ownerId 로 필터(파티션키는 `/id` 유지, ownerId 필터로 격리 — 컨테이너 재생성 회피). 기본 보드 "전체" 는 사용자별 시드.
  - **API**: `GET /api/auth/login|callback`, `POST /api/auth/logout`, `GET /api/auth/me` + `requireAuth` 미들웨어(데이터 라우트 보호, health·auth 공개). ownerId 는 **세션에서만**.
  - **프론트**: `useAuth` 컨텍스트, 401→로그인 화면(GitHub 버튼), 아바타·로그아웃, `credentials:'same-origin'`.
  - **보안(OWASP)**: state CSRF 방지·오픈리다이렉트 차단·변경요청 Origin 검사·client secret 은 App Settings(secure)/Key Vault.
  - **인프라**: Bicep `users` 컨테이너 + 앱설정 `GITHUB_OAUTH_CLIENT_ID/SECRET`·`SESSION_SECRET`. GitHub OAuth 앱 등록(콜백 URL)은 사용자가 1회.

### 26. 병렬 작업 분리 — 서로 간섭하지 않는 트랙 선정 (2026-06-20)
- **Q**: 기능을 병렬 처리할 예정. 각 작업이 서로 간섭하지 않을 만한 작업들을 골라줘.
- **A / 결정**:
  - 현 상태 점검: 항목 25(GitHub OAuth 인증)가 **미커밋**으로 코어 파일 대부분 점유 중. 핫 파일 = 백엔드 `app/service/store/memory-store/cosmos-store/server/types`, 프론트 `App.tsx/api.ts/Sidebar.tsx/styles.css/types`, `infra/*`.
  - 병렬은 **인증이 안 건드린 파일·신규 디렉터리**에서만 선정 → 4개 배타적 트랙 추천:
    - **A. AI 요약 품질 개선** — `api/src/ai.ts`(+test). 시그니처 유지.
    - **B. 본문 추출 견고화** — `api/src/extract.ts`·`ssrf.ts`(+test). `Article` 형태 유지.
    - **C. 카드 UI/상세 개선** — `web/.../CardItem.tsx`·`Board.tsx`+신규 `card.css`(+test). 새 props·`styles.css` 미사용.
    - **D. Chrome 확장(2차)** — 신규 `extension/*`. 기존 API만 호출, 0 충돌.
    - (선택) **E2E 자동화** — 신규 `e2e/*` + 자체 package.json.
  - 회피 규칙: 네 트랙 모두 `types/store/service/app/server/App.tsx/api.ts/Sidebar.tsx/styles.css` 미수정. 새 필드·엔드포인트·props 필요 시 인증과 충돌하므로 병렬 제외 후 순차 처리.
  - 권장: 진행 중 인증을 먼저 커밋/stash 해 안정 베이스 확보 후 레인 시작.

### 27. 보드 공유 기능 — 공개 읽기 전용 링크 (2026-06-20)
- **Q**: 보드를 채우고 해당 보드를 공유할 수 있는 기능 만들어줘.
- **A / 결정**:
  - **공유 토큰**: `Board.shareId`(nullable) 추가. `newShareId()` = UUID(하이픈 제거, 32 hex, 122비트) — 추측 불가한 공개 식별자. 공유 시 1회 생성·재사용(idempotent), 중지 시 `null`.
  - **API**: `POST /api/boards/:id/share`(공유 시작·링크 반환), `DELETE /api/boards/:id/share`(공유 중지) — 모두 `requireAuth`. 공개 조회 `GET /api/shared/:shareId` 는 **인증 없이** 접근(`security: []`), 보드명·소유자(이름/아바타)·카드만 반환.
  - **스토어**: `Store` 에 `updateBoard`·`getBoardByShareId`·`listCardsByBoardId` 추가, memory·cosmos 양쪽 구현. 모든 조회는 ownerId 격리 유지, 공개 조회만 shareId 기반.
  - **프론트**: 상단바 `ShareBar`(🔗 공유 → 링크/복사/공유중지), `?share=<id>` 진입 시 `main.tsx` 가 읽기 전용 `SharedBoard` 렌더(편집 컨트롤 없음, 카드 위치 보존, "나도 Curio 시작하기" CTA).
  - **보안**: shareId 추측 불가 + 서버에서 `board.shareId !== shareId` 이중 검사로 404. 공개 뷰는 메모·소유자 이메일 등 민감정보 미노출.
  - **테스트**: 백엔드 service·store·app(supertest) 공유 경로 추가 → **91개**, 프론트 api·App·신규 `SharedBoard` → **32개**, 합계 **123개 통과**. OpenAPI(redocly) 유효.
  - **E2E 시연**: 단일 서버(api/public)에서 카드 추가 → 공유 링크 발급 → `?share=` 읽기 전용 뷰 정상 확인(스크린샷). dev 프록시(5173→7071)는 동일 출처 CSRF 방어에 걸리므로 시연은 단일 출처로 진행.

### 28. Azure 실제 배포 — 빌드/런타임/시드 문제 해결 (2026-06-20)
- **Q**: GitHub OAuth 인증 + 공유 기능을 포함해 Azure 에 실제 배포(`azd up`)하고 동작 확인.
- **A / 결과**:
  - **빌드 실패 진단·수정**: Oryx 원격 빌드에서 `sh: 1: tsc: not found`. 원인 = 앱 설정 `NODE_ENV=production` 이 `npm install` 의 devDependencies(typescript) 설치를 건너뜀. `NPM_CONFIG_PRODUCTION=false` 로는 해결 안 됨(NODE_ENV 우선). **`NODE_ENV=production` 앱 설정 제거**로 해결 → 서버에서 tsc 컴파일 성공. (프로덕션 감지는 코드에서 `WEBSITE_SITE_NAME` 사용, NODE_ENV 의존 없음.)
  - **런타임 콜드 스타트**: 첫 컨테이너 기동이 230s 제한 초과(ContainerTimeout)했으나 재시도에서 warmup 프로브 69s 만에 성공·`Site started`. azd 는 20분 대기 타임아웃으로 먼저 종료됐지만 **실배포는 성공**. (alwaysOn 으로 이후 웜 유지.)
  - **기본 보드 시드 버그 수정**: `cosmos-store.ensureUserSeed` 가 `item().read()` 의 404 throw 에만 의존 → 일부 SDK 동작에서 404 시 throw 대신 `resource: undefined` 반환하여 upsert 분기를 건너뜀(기본 "전체" 보드 미생성). `Boolean(resource)` 로 존재 여부를 명시 확인 후 upsert 하도록 수정. 재배포.
  - **동작 확인(LIVE)**: `https://app-curio-osnoy7.azurewebsites.net`
    - `/api/health` → 200 `{"status":"ok","copilotMode":"live","authMode":"demo","version":"0.1.0"}`
    - `/` SPA → 200 · `/api/boards` → 200(Cosmos 키리스 RBAC 읽기/쓰기 정상) · `/api/auth/me` → 데모 사용자
  - **인증 모드**: OAuth env(`GITHUB_OAUTH_CLIENT_ID/SECRET`·`SESSION_SECRET`) 미설정 → 배포본은 **데모 모드**(로그인 없이 즉시 사용). 실제 GitHub 로그인 활성화는 사용자가 GitHub OAuth 앱 등록(콜백 `https://app-curio-osnoy7.azurewebsites.net/api/auth/callback`) 후 `azd env set` 3개 + 재배포로 전환.
  - **교훈**: Oryx devDep 설치는 `NODE_ENV=production` 으로 차단되며 `NPM_CONFIG_PRODUCTION` 으로 못 덮음 → 제거가 정답. Cosmos `item().read()` 의 404 처리는 throw/undefined 양쪽 모두 대비.

### 29. 카드 생성 로딩 UX — 스켈레톤 아웃라인 (2026-06-20)
- **Q**: 카드를 생성할 때 생성 중임을 알 수 있도록 카드 아웃라인을 미리 그려주고, 로딩 중임을 알 수 있는 UI/UX 를 구성해줘.
- **A / 결정**:
  - **낙관적 자리표시(스켈레톤)**: 링크 제출 즉시 보드에 "생성 중" 카드 아웃라인을 그리고, 서버 응답이 오면 실제 카드로 교체. 여러 링크 동시 생성을 위해 `PendingCard[]`(임시 id+url) 배열로 관리.
  - **신규 컴포넌트** `CardSkeleton.tsx`: 점선 테두리 카드 + 좌상단 스피너 + "요약 생성 중…" + shimmer 썸네일/3줄 텍스트/태그 자리 + 처리 중 URL 표시. `role=status`·`aria-busy`·`aria-label` 접근성.
  - **App/Board 연결**: `App.addCard` 가 setBusy 대신 pending 추가/제거(성공·실패 모두 finally 에서 제거), `LinkInput busy={pending.length>0}`(버튼 "카드 생성 중…" 비활성), `Board` 가 cards 뒤에 pending 스켈레톤을 좌상단 살짝 오프셋 배치, empty 문구는 cards·pending 모두 0 일 때만.
  - **CSS**: shimmer keyframes(`background-position` 이동) + 스피너 회전 + `prefers-reduced-motion` 시 애니메이션 정지(접근성).
  - **테스트**: 신규 `CardSkeleton.test.tsx`(3) + `App.test.tsx` 에 지연 Promise 로 생성 중 스켈레톤 표시→완료 시 실제 카드 교체, 실패 시 스켈레톤 제거+에러 토스트(2) 추가 → 프론트 **37개**(기존 32+5) 통과, tsc strict+빌드 OK.
  - **시각 시연**(Playwright route mock, 응답 4s 지연): 스켈레톤(점선 아웃라인·스피너·shimmer·URL·버튼 "카드 생성 중…") 표시 후 실제 카드로 교체·버튼 복귀 스크린샷 확인.

### 30. 보드 공유 배포 + 프로덕션 startup 크래시 루프 수정 (2026-06-20)
- **Q**: 보드 공유 기능을 커밋하고 Azure 배포까지 진행해줘.
- **A / 결정**:
  - **커밋**: 보드 공유 기능을 `b7b70a7` 로 커밋(인증·카드 스켈레톤과 공유 코어 파일이 얽혀 분리 불가 → 단일 커밋, 36파일 +2286/−169).
  - **재배포**: `azd up` — 인프라는 기존 존재(provision "Skipped: no changes"), 코드만 재배포. azd 가 `BuildInProgress` 폴링 타임아웃으로 실패 보고했으나 Kudu 로그 "Deployment successful" + 엔드포인트 정상 → **실배포 성공**(azd 폴링 타임아웃 ≠ 배포 실패).
  - **크래시 루프 진단**: 배포 직후 정상 동작하다 컨테이너가 `Container did not start within 230s`·`exit code 1` 재시작 루프에 빠짐(모든 엔드포인트 000/타임아웃). 원인 = 라이브 앱 `startupCommand=null` → App Service 기본값 `npm start` = `tsx src/server.ts` 실행. **tsx 는 devDependency·매 기동마다 TS 재트랜스파일**이라 느리고 불안정. Bicep 엔 `appCommandLine: 'node dist/server.js'` 가 있었으나 provision skip 으로 라이브 미반영.
  - **수정**: `az webapp config set -g rg-curio -n app-curio-osnoy7 --startup-file "node dist/server.js"` + restart → **health 200 / 2.4s 즉시 복구**. Bicep 과 동일 값이라 향후 `azd up` 에도 유지.
  - **검증(LIVE)**: `/api/health` 200 `copilotMode:live`. 공개 공유 조회 `GET /api/shared/<id>` 200(보드명 + Copilot 라이브 요약 카드 반환, 메모/이메일 등 민감정보 미노출), 조회 직후 health 200 → **크래시 재발 없음**.
  - **교훈**: 프로덕션 Node App Service 는 반드시 컴파일된 `node dist/server.js` 로 기동. `tsx`/dev `npm start` 금지. azd provision "Skipped" 면 siteConfig(appCommandLine) 가 라이브에 안 닿을 수 있으니 `az webapp config show --query startupCommand` 로 확인.

### 30. 배포 사이트에서 카드 썸네일이 안 보이는 문제 (2026-06-20)
- **Q**: 썸네일 이미지는 잘 가지고 있는데 해당 링크를 카드에 표현하지 못하는 것 같다, 확인해줘.
- **A / 결정**:
  - **증상**: 배포 사이트(app-curio-osnoy7)에서 모든 카드의 썸네일이 표시되지 않음.
  - **진단**: 추출(extract)·저장(store)·API응답·프론트 렌더 코드는 전부 정상. 로컬 단일서버 E2E 로 Wikipedia 썸네일이 1280×850 으로 `display:block` 렌더됨을 스크린샷 확인. 배포 백엔드도 imageUrl 정상 추출(Wikipedia/MDN curl). CSP·mixed content 아님(배포 referrer 로 wikimedia/MDN 이미지 `ok` 로드).
  - **원인 확정**: **referrer 기반 hotlink 차단**. 배포 referrer 로 `regexr.com/assets/card.png` 로드 시 `error/blocked`, `no-referrer` 시 `ok 1200×630`. 브라우저가 이미지 로드 시 `Referer` 를 자동 전송 → 원본 서버가 외부 도메인 referrer 를 거부 → `onError` 로 `display:none` 처리되어 카드에서 사라짐.
  - **수정**: `CardItem.tsx`·`SharedBoard.tsx` 썸네일 `<img>` 에 `referrerPolicy="no-referrer"` 추가. 회귀 테스트 2개 추가(`getAttribute('referrerpolicy')==='no-referrer'`; JSDOM 은 IDL 프로퍼티 미reflect 라 getAttribute 사용). 프론트 **39개** 통과, tsc+빌드 OK.
  - **부수 발견**: 진단 중 배포 `from-url` 첫 curl 이 빈 응답이었으나 B1 **콜드스타트** 탓(웜업 후 201 정상). 배포본은 구버전 번들(`C_8ZRNyA`)이라 재배포 필요.
  - **배포 완료**: `azd deploy` 로 배포. 단, **azd deploy 는 root `azure.yaml` 의 prepackage 훅(web 재빌드→api/public 복사)을 실행하지 않아** 첫 배포는 구버전 번들(`BVOFoTjt`)이 그대로 올라감. 해결: 수동으로 `rm -rf api/public && cp -r web/dist api/public` 후 `azd deploy` → live 번들 `B0Mhn9lr`(no-referrer 포함) 확인. 교훈: azd deploy 전에 api/public 을 직접 갱신하거나 `azd package`/`azd up` 을 써야 훅이 실행됨.

### 31. README 작성 (2026-06-20)
- **Q**: 해당 프로젝트에 주요 기능과 개요를 리드미 파일을 작성해줘.
- **A / 결정**:
  - 루트에 `README.md` 신규 작성. PROJECT.md(설계 기준 문서)와 중복을 피하고, 프로젝트 **진입점**(개요·주요 기능·빠른 시작·구조·배포)에 집중.
  - 구성: 한 줄 소개 + 라이브 데모 링크(app-curio-osnoy7) → 핵심 가치(북마크 대비 차별점 표) → 주요 기능(11개) → 기술 스택 → 빠른 시작(api 7071 / web 5173) → 환경 변수 표 → 테스트 명령 → API 개요 표 → 프로젝트 구조 → Azure 배포(`azd up`) → 보안 → 문서 링크(PROJECT.md·LOG.md).
  - 실제 코드 기준 반영: `package.json` 스크립트(dev/test/build), `app.ts` 라우트 경로(공유·인증·organize 포함), `.env.example` 변수, `server.ts` 포트(7071), `azure.yaml`(단일 App Service + prepackage 훅).

### 32. GitHub OAuth 라이브 로그인 활성화 (2026-06-20)
- **Q**: 로그인 기능 진행 상황 확인 → 라이브 OAuth 활성화 요청("해주세요").
- **A / 결정**:
  - 코드·테스트·배포는 이미 완료 상태였고, 프로덕션만 데모 모드(OAuth env 미설정)였음. 라이브 스위치만 켜는 작업.
  - 인프라 점검: `infra/main.bicep`·`resources.bicep`·`main.parameters.json` 이 이미 OAuth 3개 변수(GITHUB_OAUTH_CLIENT_ID/SECRET·SESSION_SECRET)를 App Service appSettings 로 매핑 → 수정 불필요. `az bicep build` 통과.
  - `SESSION_SECRET` = `openssl rand -hex 32`(64자) 자동 생성 후 `azd env set`.
  - GitHub OAuth 앱은 GitHub 이 생성 API 미제공 → 브라우저 수동 등록(`open` 으로 등록 페이지 자동 오픈). 콜백 `https://app-curio-osnoy7.azurewebsites.net/api/auth/callback`.
  - 헬퍼 스크립트 `scripts/enable-github-oauth.sh` 작성: Client ID/Secret 을 `read -s`(시크릿 비표시)로 받아 `azd env set` + `azd provision`.
  - `azd provision` SUCCESS(1m20s) → appSettings 3개 Set=True 확인 → 재시작 후 `authMode:"live"` 전환 확인. `/api/auth/login` 이 `github.com/login/oauth/authorize?client_id=...` 로 302 정상.
  - **교훈**: ① `azd provision` 은 `tool.firstRunCompleted` 미설정 시 "개발도구 설치" 대화형 프롬프트에서 멈춤 → `azd config set tool.firstRunCompleted true`(또는 `AZD_SKIP_FIRST_RUN=true`) + `--no-prompt` 로 비대화형화. ② appSettings 변경 후 B1 재시작 반영에 1~2분 소요(즉시 확인 시 이전 인스턴스가 demo 응답).
  - **보안**: Client Secret 이 채팅에 노출됨 → GitHub 에서 재발급(rotate) 권장. `.env` 는 표준 변수명(GITHUB_OAUTH_CLIENT_ID/SECRET)으로 정리, gitignore 유지.

---

## 현재 상태 (스냅샷)
- **앱**: Curio — AI 웹 큐레이션 보드 (링크 → 요약 카드 → 보드 큐레이션)
- **문서**: `PROJECT.md`(설계), `LOG.md`(대화 로그), `.github/copilot-instructions.md`(작업 표준), `.azure/deployment-plan.md`(배포 계획·검증)
- **환경**: ✅ 도구 설치 완료 · Azure 로그인됨(godhkekf24@inha.edu) · azd env `curio`(koreacentral) · `gh` 로그인(SmileJune) · **Copilot SDK LIVE 확인**
- **테스트**: ✅ 백엔드 91 + 프론트 37 = **128개 통과** · 타입체크·빌드·azd preview/package 통과
- **코드**: 백엔드 `api/`(비동기 스토어 memory/cosmos + 정적 SPA 서빙) + 프론트 `web/` + `azure.yaml`/`infra/`(Bicep) · 기능단위 커밋 20+개
- **배포 상태**: ✅ **LIVE** — `https://app-curio-osnoy7.azurewebsites.net` (App Service Linux B1 + Cosmos serverless, 키리스 RBAC). 보드 공유 기능 배포됨. startup 커맨드 `node dist/server.js` 명시(tsx 크래시 루프 수정). **GitHub OAuth 라이브 로그인 활성화됨**(authMode=live, `/api/auth/login` → github.com 302 정상).

