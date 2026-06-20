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

---

## 현재 상태 (스냅샷)
- **앱**: Curio — AI 웹 큐레이션 보드 (링크 → 요약 카드 → 보드 큐레이션)
- **문서**: `PROJECT.md`(설계), `LOG.md`(대화 로그), `.github/copilot-instructions.md`(작업 표준)
- **환경**: ✅ 도구 설치 완료 · Azure 로그인됨 · `gh` 로그인(SmileJune) · `.env` 준비 · **Copilot SDK LIVE 확인**
- **테스트**: ✅ 백엔드 60 + 프론트 20 = **80개 통과** · 타입체크·빌드 통과
- **코드**: 백엔드 `api/`(9 엔드포인트 + og:image 썸네일) + 프론트 `web/`(보드 UI + 썸네일) · 기능단위 커밋 18+개
- **다음 단계**: Azure 배포 — azd+Bicep 으로 SWA+Functions+Cosmos 스캐폴드(리소스 계획 확정)

