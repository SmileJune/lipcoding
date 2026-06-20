# Curio — 프로젝트 작업 지침 (에이전트 공통)

Curio 는 링크를 AI 요약 **카드**로 만들어 비주얼 **보드**에 큐레이션하는 개인 생산성 웹 앱입니다.
- 설계 문서: `PROJECT.md`
- 대화 로그: `LOG.md`

## 작업자 제약 (중요)
- 사용자는 **키보드 없이 음성으로 코딩**합니다(입코딩). 타이핑 불가, **음성 입력·제출·브라우저 클릭은 가능**.
- **확인 질문을 최소화**하고 결정·실행은 에이전트가 자율적으로 진행합니다.
- 꼭 물어야 한다면 **음성으로 답하기 쉬운 객관식**으로 질문합니다.

## 필수 규칙
1. **대화 로그**: 모든 질문·답변·결정을 `LOG.md` 에 누적 기록한다. 형식 `### 번호. 제목` → `- **Q**:` / `- **A / 결정**:`. 작업 종료 시 갱신.
2. **Copilot SDK**: AI 기능은 GitHub Copilot SDK 로 구현한다. 토큰 미설정 시 **데모 폴백**을 유지해 앱이 항상 동작하게 한다.
3. **Copilot·Azure 적극 활용**: 가능한 모든 AI 기능을 Copilot 으로, 배포·데이터·호스팅은 Azure 로 구성한다.
4. **Azure 배포**: 최종 산출물은 `azd up` 으로 Azure 에 배포한다(Static Web Apps + Functions + Cosmos DB).
5. **테스트 필수**: 모든 코드에는 테스트를 작성하고 **실제로 실행해 통과를 확인**한 뒤 완료로 간주한다. 테스트 없이 기능 완료로 보고하지 않는다.
6. **시크릿 관리**: 비밀값은 `.env`(gitignore) 에만 두고 코드·커밋에 넣지 않는다. 템플릿은 `.env.example`.

## 기술 스택
| 구분 | 기술 |
|------|------|
| 프론트 | React + TypeScript + Vite, `@dnd-kit` |
| 백엔드 | Node.js (Express 또는 Azure Functions), `@mozilla/readability` + `jsdom` |
| AI | GitHub Copilot SDK |
| 데이터 | 인메모리(MVP) → Azure Cosmos DB |
| 배포 | Azure Static Web Apps + Functions (`azd`) |
| 테스트 | **Vitest**(단위·통합) + **Playwright**(E2E) |

## 테스트 규약
- 새 모듈/함수에는 같은 작업 범위에서 테스트를 추가한다.
- 명령: 프론트·백엔드 각각 `npm test`. 커밋·배포 전 전체 통과 필수.
- 외부 호출(Copilot·URL fetch)은 모킹하고, **데모 폴백 경로도 테스트**한다.

## 보안
- 외부 URL fetch 는 SSRF 방지(사설 IP 차단)·본문 크기 제한.
- 토큰 등 비밀값은 환경변수 / Azure Key Vault. OWASP Top 10 준수.
