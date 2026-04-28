# Shosetu Reader

[English](README.md) · **한국어**

일본어 웹소설을 JP→KR 자동 번역과 함께 읽는 모듈러 모놀리식 리더 플랫폼.
어댑터 추상화 한 겹 뒤에 네 개의 소스가 라이브로 연결돼 있다 —
[Syosetu](https://syosetu.com/), [Nocturne](https://novel18.syosetu.com/),
[Kakuyomu](https://kakuyomu.jp/), [AlphaPolis](https://www.alphapolis.co.jp/).
스택: Next.js 16, PostgreSQL 16, Redis 기반 백그라운드 작업, 번역은 OpenRouter.

## 현재 상태

V1–V4 출시 완료. V5 대부분 출시됨: 멀티 소스 어댑터, EPUB 내보내기, 품질
대시보드, 글로서리 콜드스타트(3단계), 1000+화 노벨 안전장치, 에디토리얼 ×
코지 페이퍼 UI, 에피소드 이벤트용 SSE 기반. 사이트 디자인 하이파이 패스
(phases 1–9) 출시 — 타이포그래픽 마스트헤드, 소스 핀 칩, KR-우선 랭킹,
바이링구얼 KO·JA 리더(.para-pair), 3-pane 리더(TOC + 본문 + 글로서리), 끈끈
설정 사이드 레일과 워크로드별 모델 픽커.

DeepSeek V4 베스트 프랙티스 라우팅 라이브: prefix-cache 적중, 워크로드별
reasoning 강도, 프로바이더 핀닝, 문단 구조 엄격 보존 기본 프롬프트.

전체 스냅샷은 [`docs/progress.md`](docs/progress.md) 참고.

## 기능

- **멀티 소스 등록** — URL 또는 식별자만으로 Syosetu, Nocturne(R-18),
  Kakuyomu, AlphaPolis 등록. 등록 페이지에서 입력하는 즉시 자동 인식.
- **소스별 그룹 랭킹** — 사이트별 fan-out, R-18 핀, 상태 펄스 도트,
  소스 컬러 탭 스와치.
- **성인 콘텐츠 게이트** — 애플리케이션 레이어에서 처리. 익명 세션은
  항상 SFW; `Vary: Cookie`로 캐시 분리.
- **에피소드 인제스트** — 배치/전체/재인제스트 작업, 1000+화 대형 노벨용
  실행당 상한 안전장치.
- **웹 리더** — JA / KO / KO·JA 3-state 토글. KO·JA 모드는 한국어 문단
  위 일본어 문단을 hairline으로 묶어 보여준다(.para-pair).
- **3-pane 리더** — TOC 사이드바(현재 화 ±10), 본문, 둥근 테두리 글로서리
  드로어.
- **번역 파이프라인** — OpenRouter 기반, **워크로드별 모델 + reasoning +
  max-tokens 오버라이드** 지원. DeepSeek 계열 요청은 `provider: { only:
  ["DeepSeek"] }`로 핀닝되어 prefix-cache(입력 토큰 약 50× 절감)에 적중.
- **V3 번역 엔진** — 구조화 글로서리(상한 500), 에피소드 간 컨텍스트
  체이닝, 적응형 청킹, 품질 검증, 액티브 세션 동안 글로서리 변형을 지연시켜
  캐시 안정성 확보.
- **라이브 에피소드 업데이트** — 인제스트 + 번역 진행. 에피소드 이벤트
  SSE 기반 작동.
- **중지 버튼** — 노벨별 큐 작업 일괄 정지. 액티브 세션 취소, 큐 상태
  job_runs를 `cancelled by user`로 실패 처리, 큐/처리 중 translations도
  실패 처리.
- **에피소드별 KO 제목 수동 오버라이드** — 콘텐츠 안전 거부에 대응.
- **다중 사용자 프로필** — 게스트 데이터 마이그레이션, 사용자별 설정.
- **개인 서재** — 구독, 진행도, 이어 읽기, KO+JA 제목 스택, 인라인 동기화/
  이어 읽기 액션.
- **노벨별 글로서리 & 스타일 가이드** — 자동 추출, 콜드스타트 부트스트랩
  (JA-only 형태소 마이닝 + LLM), Stage-2 자동 승급, Stage-3 신뢰도 낮은
  엔트리 리뷰 UI.
- **비용 추적** — translate / glossary / extract / 세션 롤업.
  `prompt_cache_hit_tokens`, `prompt_cache_miss_tokens`,
  `reasoning_tokens`까지 operation+model 태그로 노출.
- **EPUB 내보내기** — 스트리밍 JSZip, 3000화 상한.
- **다크/라이트/시스템 테마** — 테마 카드 미리보기 스와치, 끈끈 설정
  레일, KO/EN 더블릿 내비게이션.
- **이중 언어 UI**(영어/한국어) — 쿠키 기반 로케일 영구 저장.
- **운영 API** — 작업 헬스, 큐 메트릭, 번역 품질, 모델 처리량.

## 성능

- **Fetch 타임아웃** — 모든 외부 호출이 `AbortSignal.timeout` 사용
  (메타데이터 15–30초, 번역 60–180초).
- **OpenRouter 모델 캐시** — Redis 기반, TTL 1시간, stale-while-revalidate.
  `src/instrumentation.ts`에서 부팅 시 프리워밍.
- **DeepSeek prefix-cache 활용** — 시스템 프롬프트 + 글로서리 리스트가
  세션 내 모든 에피소드에서 바이트-동일하게 유지되어 2번째 화부터 캐시
  적중. 자동 승급과 에피소드별 글로서리 변형은 액티브 세션 동안 미루고,
  세션 종료 시 단일 `glossary.refresh`로 일괄 적용.
- **프로바이더 핀닝** — `deepseek/*` 모델은 `provider: { only:
  ["DeepSeek"] }`로 고정해 OpenRouter가 캐시 도메인 밖으로 라우팅하지
  못하게 함.
- **워크로드별 reasoning** — translate / title / summary는 reasoning OFF;
  extraction LOW; compare / bootstrap HIGH.
- **벌크 번역 진행 쓰기 스로틀** — 약 1% 단위(500ms 하한).
- **타이틀 번역 병렬화** — bounded concurrency 3.
- **공유 GET HTTP 캐시** — `s-maxage=300, swr=1800`.
- **대형 노벨 안전장치** — 페이지네이션된 에피소드 리스트, EPUB 컬럼
  프로젝션 읽기, 실행당 인제스트 상한, 병렬 live-status,
  `translations(episode_id) WHERE target_language='ko'` 부분 인덱스.

## 스택

- **프레임워크**: Next.js 16(App Router) + TypeScript
- **스타일링**: Tailwind CSS 4, `data-theme`(paper / sepia / night / system)
- **데이터베이스**: Drizzle ORM + PostgreSQL 16
- **큐**: Redis 기반 영구 작업 큐 + 전용 워커
- **번역**: OpenRouter(OpenAI 호환), 기본 DeepSeek V4
- **검증**: Zod
- **테스트**: Vitest + Playwright 스모크
- **배포**: Docker Compose
- **패키지 매니저**: pnpm

## 빠른 시작 (로컬)

```bash
cp .env.example .env    # DATABASE_URL, OPENROUTER_API_KEY 등 채우기
pnpm install
pnpm db:migrate
pnpm dev                # 앱: http://localhost:3000
pnpm worker             # 백그라운드 작업
```

PostgreSQL과 Redis가 `localhost`에서 동작 중이어야 한다. 비동기 인제스트와
번역에는 워커 프로세스가 필요하다.

## 프로덕션 (Docker)

```bash
cp .env.example .env.production   # 비밀값 채우기
docker compose up -d --build      # app + worker + db + redis (port 3000)
```

마이그레이션은 컨테이너 시작 시 자동 적용.

## 환경 변수

전체 스키마는 `.env.example`에 있다. `OPENROUTER_*` 노브는 다음 순서로
해석된다:

```
user.workloadOverrides[workload]  ← 설정 → 번역 페이지
  → OPENROUTER_${WORKLOAD}_MODEL  ← .env 워크로드별 오버라이드
    → OPENROUTER_DEFAULT_MODEL    ← .env 글로벌 기본
```

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `OPENROUTER_DEFAULT_MODEL` | `deepseek/deepseek-v4-flash` | 워크로드별 오버라이드가 없을 때의 폴백. |
| `OPENROUTER_TRANSLATE_MODEL` | inherit | 에피소드 본문 번역. |
| `OPENROUTER_TITLE_MODEL` | inherit | 제목 배치(랭킹, 에피소드 리스트). |
| `OPENROUTER_SUMMARY_MODEL` | inherit | 세션 컨텍스트 요약. |
| `OPENROUTER_EXTRACTION_MODEL` | inherit | 에피소드별 JSON 글로서리 추출. |
| `OPENROUTER_COMPARE_MODEL` | inherit | 비교 / 재번역. |
| `OPENROUTER_BOOTSTRAP_MODEL` | inherit | 콜드스타트 글로서리 마이닝. |
| `OPENROUTER_REASONING_${WORKLOAD}` | 워크로드별 | `off` / `low` / `high` / `xhigh`. translate / title / summary는 `off`, extraction은 `low`, compare / bootstrap은 `high`. |
| `OPENROUTER_MAX_TOKENS_${WORKLOAD}` | 워크로드별 | translate=4096, title=1024, summary=2048, extraction=4096, compare=8192, bootstrap=8192. |
| `OPENROUTER_PROVIDER_PIN` | `deepseek/*`에 대해 `DeepSeek` | 콤마 구분. 빈 문자열은 자동 핀닝 비활성. |
| `GLOSSARY_MAX_PROMPT_ENTRIES` | `500` | 번역 프롬프트에 주입되는 confirmed 엔트리 수. |
| `TRANSLATION_COST_BUDGET_USD` | 미설정 | 초과 시 세션 자동 일시정지. |
| `ADMIN_API_KEY` | 미설정 | 프로덕션의 `/api/admin/*` 엔드포인트에 필수. |

DeepSeek V4 베스트 프랙티스 페어링(이미 `.env.example`에 적용됨):

```
OPENROUTER_TRANSLATE_MODEL=deepseek/deepseek-v4-flash    # 출력 비용 위주
OPENROUTER_TITLE_MODEL=deepseek/deepseek-v4-flash
OPENROUTER_SUMMARY_MODEL=deepseek/deepseek-v4-flash
OPENROUTER_EXTRACTION_MODEL=deepseek/deepseek-v4-flash
OPENROUTER_COMPARE_MODEL=deepseek/deepseek-v4-pro        # 품질 민감
OPENROUTER_BOOTSTRAP_MODEL=deepseek/deepseek-v4-pro
```

## 글로벌 번역 프롬프트 베스트 프랙티스

아래 프롬프트는 `src/modules/translation/domain/default-prompt.ts`에 기본값
으로 들어 있다. 다음 두 가지가 비타협적 제약이다:

1. 리더의 KO·JA 바이링구얼 모드(`.para-pair`)와 ComparePane 모두 원문과
   번역문을 **`\n` 기준으로 split해 인덱스 zip**한다. 병합·분할·빈 줄
   드리프트 어느 하나라도 발생하면 그 지점부터 모든 문단이 어긋난다 →
   문단 구조 섹션이 가장 먼저, 가장 강한 어조로 명시된다.
2. 의성어, 호칭, 대화 부호, 스킬명 풀이는 과거에 줄바꿈을 새로 끼워
   넣은 사례가 있다. 레이아웃에 영향을 주는 모든 규칙은 자체적으로
   "줄바꿈 금지"를 다시 한 번 명시한다.

설정 → 번역 → "글로벌 번역 프롬프트"에 그대로 붙여넣거나, 자체 프롬프트
로 시작할 때 다음 골격을 사용하면 된다:

````markdown
# 일본 웹소설 한국어 번역 가이드라인

## 문단 구조 — 최우선 규칙
이 시스템은 원문과 번역문을 줄바꿈(\n) 기준 인덱스 매칭으로 정렬합니다.
- 문단 수 일치: 원문 N문단 → 번역문 N문단.
- 빈 문단 보존: 원문의 빈 줄은 같은 위치에 빈 줄로 출력한다.
- 문단 병합 / 분할 금지.
- 줄바꿈 위치 동일.
- 1:1 원칙 — 어떠한 이유로도 깨지지 않는다.

## 출력 형식
- 번역된 본문만 출력. "번역:", "Here is the translation", 머리말, 후기, 주석 금지.
- 마크다운 헤더, 코드 블록 등 원문에 없는 형식 마크업 금지.
- 〈〉, 【】, 《》, ※, 〜, ──, …… 같은 기호는 위치·개수까지 보존.
- 반각/전각 공백, 말줄임표, 물결표, 느낌표 개수 등 시각적 뉘앙스를 정규화하지 않는다.

## 문체 및 시점
- 서술 시점(1인칭/3인칭) 일관 유지.
- 일본어 경어를 한국어 존댓말/반말에 자연스럽게 대응.
- 라이트노벨 / 웹소설 톤(짧은 문장, 속도감, 감정 직설)으로 옮긴다.

## 고유명사
- 글로서리 등록 표기 우선. 없으면 원문 그대로(카타카나/한자) 또는 음차.
- 스킬·마법·아이템 이름은 원문 유지. 첫 등장에만 같은 문단 안에서 짧은
  괄호 풀이 가능. 절대 줄바꿈하지 않는다.

## 호칭
- -さん/-くん/-ちゃん/先輩/先生 등은 인물 관계에 맞는 한국어로.
  에피소드 내 일관성을 유지한다.

## 대화·인용 부호
- 원문이 사용한 「」 / 『』 / "" / () 를 그대로 유지. 임의로 바꾸지 않는다.

## 의성어·의태어
- ドキドキ → 두근두근 / ワクワク → 두근두근·설렘 / キラキラ → 반짝반짝.
- 한국어에 자연스러운 대응이 없으면 의미를 풀어 한 단어로.

## 절대 금지
- 원문에 없는 내용 추가, 의미 임의 확장·축소.
- 번역자 주석, 해설, "TL note", "역주" 등 메타 정보.
- 문단 구조를 바꾸는 모든 변경 — 위 "문단 구조" 규칙이 이 모든 항목에 우선한다.
````

각 섹션에 구체적 예시까지 들어간 풀버전은
`src/modules/translation/domain/default-prompt.ts`에 있고,
`GET /api/translation-settings`의 `defaultGlobalPrompt` 필드로도 노출된다.

## 명령어

| 명령 | 설명 |
|------|------|
| `pnpm dev` | 개발 서버 시작(Turbopack) |
| `pnpm worker` | 백그라운드 작업 워커 시작 |
| `pnpm build` | 프로덕션 빌드 |
| `pnpm start` | 프로덕션 서버 시작 |
| `pnpm lint` | ESLint 실행 |
| `pnpm typecheck` | TypeScript 타입 검사 |
| `pnpm check` | lint + typecheck |
| `pnpm test` | Vitest 실행 |
| `pnpm test:watch` | Vitest watch 모드 |
| `pnpm dev:verify` | check + test + build 일괄 |
| `pnpm dev:smoke` | 동작 중인 앱에 핵심 HTTP 스모크 호출 |
| `pnpm test:browser` | Playwright 브라우저 스모크 |
| `pnpm dev:loop` | 로컬 검증 풀 루프 |
| `pnpm canary` | 4개 소스에 대한 라이브 페치 드리프트 감지 |
| `pnpm db:generate` | Drizzle 마이그레이션 생성 |
| `pnpm db:migrate` | 마이그레이션 적용 |
| `pnpm db:studio` | Drizzle Studio 열기 |

## 프로젝트 구조

```text
src/
  app/              Next.js App Router 페이지와 API 라우트
  components/       공유 React 컴포넌트
  lib/              공유 인프라(db, i18n, auth, rate-limit, cache, redis, env)
  modules/          도메인 모듈(모듈러 모놀리스)
    source/         네 개의 소스 어댑터(syosetu / nocturne / kakuyomu / alphapolis)
    catalog/        노벨 + 에피소드 + 랭킹 + 성인 필터
    library/        구독, 진행도, 이어 읽기
    translation/    파이프라인, 세션, 글로서리(bootstrap / promote / refresh / extract)
    reader/         리더 페이로드 어셈블리(±10 TOC 윈도우 포함)
    identity/       프로필, 세션, 사용자 범위 설정
    jobs/           Redis 큐 + 워커 런타임 + 복구
    events/         에피소드 이벤트용 Redis pub/sub
    export/         스트리밍 JSZip EPUB 빌더
    admin/          운영 가시성
tests/              Vitest + Playwright
drizzle/            28개의 SQL 마이그레이션
docs/               아키텍처, 디자인(layout-v2 하이파이 스펙 포함), 기획
scripts/canary-source-fetch.ts   HTML 스크레이핑 소스용 라이브 페치 캐너리
```

## API 개요

| 영역 | 엔드포인트 |
|------|-----------|
| **발견** | `POST /api/novels/register`, `GET /api/ranking?scope=sfw|all|<site>&period=…`, `POST /api/ranking/translate-titles` |
| **노벨 & 에피소드** | `GET /api/novels/[id]`, `.../episodes`, `POST .../ingest`, `.../ingest-all`, `.../reingest-all`, `GET .../live-status`, `GET .../export?format=epub`, `POST .../episode-titles`, `POST .../cancel` |
| **번역** | `POST .../bulk-translate`, `.../bulk-translate-all`, `.../bulk-retranslate`, `.../translate-session/abort`, `DELETE .../translations/discard` |
| **에피소드별** | `POST .../request`, `GET .../status`, `GET .../events`(SSE), `DELETE .../discard` |
| **글로서리** | `GET/PUT/POST .../glossary`, `.../entries`, `.../entries/[id]`, `.../entries/import`, `.../bootstrap`, `.../refresh` |
| **서재** | `GET /api/library`, `POST/DELETE .../subscribe`, `PUT /api/progress` |
| **신원** | `POST /api/auth/sign-in`, `.../sign-out`, `GET .../session`, `GET .../csrf`, `GET/POST /api/profiles`, `GET/PUT/DELETE .../active` |
| **리더 & 설정** | `GET /api/reader/episodes/[id]`, `GET/PUT /api/settings`(`adultContentEnabled` 포함), `GET/PUT /api/translation-settings`(`workloadOverrides` 포함), `GET /api/openrouter/models`, `GET /api/stats` |
| **번역 품질** | `GET /api/translations/quality/summary`, `GET .../quality/list` |
| **관리자** | `GET /api/health`, `.../jobs`, `.../metrics`, `GET/POST .../scheduled`, `GET .../translations`, `.../translations/quality`, `.../translations/trends` |
| **작업** | `GET /api/jobs/[id]`, `GET /api/novels/[id]/jobs/current` |

## 페이지

| 페이지 | 설명 |
|--------|------|
| 홈 | 히어로 + 이어 읽기 |
| 서재 | 구독 노벨 — KO+JA 제목 스택, 인라인 동기화 / 이어 읽기 |
| 랭킹 | 멀티 소스 그룹 — 기간 스트립, 컬러 스와치 탭, R-18 핀 |
| 등록 | 4개 사이트 자동 인식, 미리보기 카드, 형식 그리드, 최근 등록 |
| 노벨 상세 | 라이브 업데이트 에피소드 리스트, 글로서리 에디터(저신뢰 엔트리용 Review 탭 포함), 번역 인벤토리, 일괄 작업, 중지 버튼 |
| 리더 | TOC 사이드바, JA / KO / KO·JA 토글, .para-pair 바이링구얼 모드, 글로서리 드로어, 모델 전환, 폰트 설정 |
| 설정 | 끈끈 200px 레일(계정 / 읽기 / 번역 / 데이터) — 테마 카드, 폰트 스택 픽커, 스테퍼 트리오, 워크로드별 모델 픽커 |
| 통계 | 읽기 통계 |
| 프로필 | 생성, 전환, 게스트 데이터 마이그레이션 |
| 로그인 | 가벼운 신원 진입점 |

## 문서

[`docs/`](docs/)에 아키텍처와 기획 자료가 있다:

- [Progress](docs/progress.md) — 현재 구현 상태
- [Layout v2 하이파이 스펙](docs/layout/layout-v2/) — Claude Design 핸드오프
  번들 + 미해결 TODO 펀치 리스트
- [멀티 소스 디자인 노트](docs/claude-design/) — 어댑터 인터페이스, 레지스트리,
  사이트별 어댑터, API/캐시, UI, 함정
- [V1 Goal](docs/v1-goal.md), [V1 Architecture](docs/v1-architecture.md),
  [V1 Design](docs/v1-design.md), [V1 Design Style](docs/v1-design-style.md)
- [V2 Architecture](docs/v2-architecture.md) — 다중 사용자, 영구 작업, 라이브
  업데이트
- [V3 Architecture](docs/v3-architecture.md) — 글로서리, 컨텍스트 체이닝, 품질
  검증
- [V3 Review](docs/v3-review.md), [V4 Plan](docs/v4-plan.md),
  [V5 Plan](docs/v5-plan.md)
- [Dev Loop Harness](docs/dev-loop-harness.md) — 로컬 검증 워크플로
- [보안 감사](docs/security-audit-2026-04-15.md)

## 라이선스

[MIT](LICENSE)
