# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

**Greenfield / pre-implementation.** The repo currently contains only planning documents — no source code, build system, or tests exist yet. When implementing, you are establishing conventions from scratch; there is no existing stack to follow. Confirm language/framework choices before scaffolding.

- `목적.md` — the authoritative spec (Korean). Defines the system goal and the full multi-agent pipeline with per-agent prompts and JSON I/O contracts.
- `네이버검색API.md` — Naver Search API app registration (`stocknews`) and credentials.
- `.bkit/state/` — bkit plugin state (`pdca-status.json`, `memory.json`). Not application code.

## Goal

Build a **Korean stock-market pre-trade intelligence site + REST API**. It aggregates real-time domestic news, scores its market impact, matches it to tickers with a technical/chart read, risk-checks the conclusion, and publishes approved trade signals via a website and REST API.

## Architecture: Sequential Multi-Agent Pipeline

The system is a strict **hand-off chain** where each agent consumes the prior agent's structured output. The `news_id` (format `YYYYMMDD_NNN`) is the correlation key threaded through every stage. Each stage emits a fixed JSON shape defined in `목적.md` — treat those shapes as **API contracts**: changing a field is a breaking change across the whole pipeline.

```
팀원1 (Claude) ─ news collection
   │  {news_id, timestamp, title, content(≤3 lines), source}
   ▼
팀원2 (Claude) ─ impact / importance scoring
   │  {news_id, title, sector, impact_level(상/중/하), importance_score(1-10), analysis_reason}
   ▼
팀원3 (Codex)  ─ ticker matching + rise-probability quant
   │  {news_id, ticker_name, market_status(눌림목/저점/과다상승), probability_of_rise, trading_strategy}
   ▼
팀원4 (Codex)  ─ risk control / cross-validation  ──reject──▶ back to 팀원3
   │  PASS|REJECT + integrated data object
   ▼
팀장 (Claude)  ─ final review, Markdown briefing
   ▼
CEO (Codex)    ─ approval gate (APPROVED만 통과)
        {status:PUBLISHED, target_stock, signal_probability, position_type, headline, published_at}
   ▼
디자이너 (Claude) ─ 다크 금융 대시보드 디자인 작성 (디자인 토큰 + shadcn/ui 컴포넌트)
   ▼
팀원5 (Claude) ─ 프론트엔드 엔지니어: 디자인에 데이터 바인딩 → 웹사이트 게시
   ▼
팀원6 (Codex)  ─ REST API 엔지니어: 외부 공개 읽기 전용 API 발행 (GET /api/signals[/{post_id}])
```

Roles by model: **Claude** handles collection (팀원1), impact scoring (팀원2), team-lead review (팀장), **design (디자이너)**, and frontend post authoring (팀원5). **Codex** handles quant/ticker matching (팀원3), risk validation (팀원4), CEO approval, and REST API publishing (팀원6).

The pipeline ends with a **publish stage gated on CEO approval**: only `APPROVED` items flow to 디자이너 → 팀원5 → 팀원6. The 디자이너 produces the visual design (tokens + styled components); 팀원5 binds approved data into it and publishes; 팀원6 exposes it. The REST API (팀원6) is **read-only for external clients** — creation happens solely through the internal CEO-approval path.

## 프론트엔드 스택 (확정)

게시 웹사이트 + 공개 REST API는 **단일 Next.js 스택**으로 구성합니다.

- **Next.js (App Router) + TypeScript** — 웹페이지 + `/api/signals` REST API를 한 스택에서. SSR/SSG로 SEO 확보.
- **Tailwind CSS + shadcn/ui** (Radix 기반) — 고품질·접근성 컴포넌트로 디자인 완성도 확보.
- **Pretendard** 웹폰트 (한글), **TradingView Lightweight Charts** (차트 위치 시각화), **Framer Motion** + **lucide-react**.
- **디자인 방향**: 다크 금융 대시보드. ⚠️ **한국 시장 색 관례 — 상승=빨강, 하락=파랑** (미국과 반대). 시장 위치(눌림목/저점=안전, 과열=경고, 분석불가=중립)를 색 + 아이콘으로 코드화.
- 디자인 토큰·컴포넌트 사양은 `prompts/09_디자이너_디자인시스템.md`가 단일 출처(SSOT).
- **구현 위치**: `web/` (Next.js 앱). 디자인 토큰 = `web/app/globals.css`, 시그널 컴포넌트 = `web/components/signal/`, 사양 문서 = `docs/02-design/design-system.md`.
- ⚠️ **실행 주의**: 이 repo는 WSL 경로라 **Windows npm이 UNC 경로(`\\wsl.localhost\...`)에서 동작하지 않음**. 반드시 **WSL 내부 + Linux Node(nvm)** 로 `cd ~/stocknews/web && npm install && npm run dev`. 상세: `web/README.md`.

## 공개 REST API (팀원6, 읽기 전용)

Next.js Route Handler로 구현. 외부 클라이언트는 조회만 가능(생성은 내부 CEO 승인 경로).

- `GET /api/signals` — 게시 시그널 목록. Query: `?stock=종목명` `?page` `?limit`. 응답 `{ data[], pagination }`.
- `GET /api/signals/{post_id}` — 단일 상세. 없으면 `404 {error:{code:"NOT_FOUND"}}`.
- 데이터 흐름: `page/service → /api/signals → lib/signals/repository.ts → web/data/signals.json`. repository가 단일 출처(현재 정적 JSON, `status:"PUBLISHED"`만 노출; 운영 시 DB/팀원6 발행 스토어로 교체).
- 프론트는 `services/signal.service.ts` 경유로만 API 호출(컴포넌트 직접 fetch 금지). 서버 컴포넌트는 `lib/api/base-url.ts`로 절대 URL 구성.
- QA 결과: `docs/03-analysis/ui-qa.md`.

### Key business rules (from spec)
- **팀원4 (Risk Controller)** validates news↔ticker relevance, that bad news wasn't scored as bullish, and that chart-position calls (눌림목/저점/과다상승) are internally consistent. On failure it **rejects back to 팀원3** for rework — implement this as an actual retry loop, not a one-way flow.
- **CEO approval gate**: approve only when `probability_of_rise ≥ 85%` AND `market_status` is a safe entry (눌림목 or 저점) — explicitly **not** 과다상승/과열. Only APPROVED items get published.
- Filter promotional/duplicate ("찌라시") news at collection (팀원1); keep information-only items.

## Codex 팀원 실행 (Codex agents)

Codex 역할(팀원3·팀원4·CEO·팀원6)은 로컬 **Codex CLI**(`codex-cli`, ChatGPT 로그인 인증, model `gpt-5.5`)로 headless 실행합니다. 러너: `scripts/codex-agent.sh`.

```bash
# 기본: 프롬프트 + stdin 입력 → transcript 포함 출력
cat 팀원2_출력.json | scripts/codex-agent.sh prompts/03_팀원3_퀀트분석.md

# 스키마 강제 + 최종 결과만 파일로 (권장: 파이프라인 연결 시)
SCHEMA=schemas/03_팀원3.schema.json OUT=팀원3_출력.json \
  scripts/codex-agent.sh prompts/03_팀원3_퀀트분석.md 팀원2_출력.json
```

환경변수: `SCHEMA`(출력 JSON 스키마 강제, `schemas/*.schema.json`), `OUT`(최종 결과만 저장, transcript 제외), `SANDBOX`(기본 `read-only`; 게시 에이전트 팀원6 등 파일 쓰기 시 `workspace-write`), `MODEL`.

- 러너는 `codex exec --skip-git-repo-check --disable memories -s <sandbox>` 로 호출 (이 repo는 git 미초기화, 전역 memories 쓰기 부작용 차단).
- 스키마가 있는 Codex 에이전트: 팀원3(`schemas/03_팀원3.schema.json`), CEO(`schemas/06_CEO.schema.json`), 팀원6(`schemas/08_팀원6.schema.json`). 팀원4는 PASS/REJECT 텍스트+JSON 혼합이라 스키마 미적용.
- Claude 역할(팀원1·2·팀장·팀원5)은 이 세션/별도 Claude 인스턴스가 직접 수행.

## External Integrations

- **Naver Search API** — primary news source for 팀원1 (alongside Google News / 연합뉴스 / 이데일리 RSS feeds). App name `stocknews`.

## ⚠️ Security: exposed credentials

`네이버검색API.md` currently holds the Naver **Client ID and Client Secret in plaintext**. Before any commit/publish:
- Move these to environment variables / a `.env` (gitignored), not tracked files.
- Treat the committed secret as compromised and rotate it in the Naver developer console.
