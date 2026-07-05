# 키움증권 컨버전 — 프로젝트 시작 전 설치 매뉴얼 (skills / MCP)

> 목적: 현재 KIS(한국투자증권) 기반 시스템(파이썬 파이프라인 + Next.js 사이트 + Kimi LLM)을 **키움증권 REST API로 전환**할 때, **시작 전에 깔아두면 사고를 가장 크게 줄이는** 외부 도구 모음.
> 작성 2026-07-05. ⚠ 아래 링크는 검색으로 **존재를 확인**했으나, 커뮤니티 항목의 **품질·최신성·안전성은 도입 전 각자 검증** 필요. 설치 명령은 **검증된 것만 그대로** 적고, 미확인은 `⚠ repo README에서 최종 확인`으로 표기.

---

## 핵심 논리 (왜 이 순서인가)

KIS→키움 전환의 90%는 **API 클라이언트 재작성**이다. 최다 사고 = 필드명·TR코드·응답구조를 **잘못 추측**하는 것. 그래서 "Claude가 실제 키움 API를 직접 때려보며 코드를 짜게 하는 도구"가 1순위다(추측 제거 = 환각 제거).

MCP 설정 위치(Claude Code): `~/.claude.json` (전역) 또는 프로젝트별 `.mcp.json`.

---

## STEP 0 — 키움 키 발급 (이게 진짜 첫 단계)

무엇보다 먼저: 아래 MCP도 키가 있어야 돈다.

1. **키움 REST 포털 가입 → App Key / Secret Key 발급 (모의투자 + 실전 둘 다)**
   - https://openapi.kiwoom.com/
   - TR 스펙(엔드포인트·TR ID·응답 필드명) **원본 문서도 여기**. 컨버전의 사양서.
2. 키는 **`.env`에만** 저장(하드코딩 금지). 유출 시 타인이 주문 가능.
3. ⚠ **키움 토큰은 발급 IP에서만 유효** → MCP 서버와 클라이언트가 **같은 IP**여야 함. 프로덕션 Mac IP 고정 전제로 설계.

---

## TIER 1 — 반드시 (환각 직결)

### 1. 키움 MCP 서버 — 실제 API를 Claude가 직접 조회
개발 중 실제 키움 REST를 조회해 **진짜 필드명·TR·응답 확인**하며 코드 작성(추측 제거). read-only·모의/실전 지원·OAuth/토큰/rate-limit 내장.
- 링크: https://glama.ai/mcp/servers/java-jaydev/kiwoom-mcp
- 설치: ⚠ **repo README에서 최종 확인** (glama 페이지의 설치 지침 따를 것).
- ⚠ **주문(매수/매도) 기능 있는 버전이면 극도로 신중** — 개발 중 실계좌 사고 위험. 가능하면 **read-only + 모의투자 키**로 시작.

### 2. Context7 MCP — 최신 라이브러리 문서 주입
Next.js·React·Tailwind 등 **버전별 최신 문서를 프롬프트에 주입** → 웹 쪽 옛 API 환각 차단.
- 링크: https://github.com/upstash/context7
- 설치(✅ 검증된 명령):
  ```bash
  claude mcp add context7 -- npx -y @upstash/context7-mcp --api-key YOUR_API_KEY
  ```

---

## TIER 2 — 강력 권장

### 3. Playwright MCP (Microsoft 공식) — 사이트 실제 브라우저 검증
"사이트 포함" 전환이므로 필수. 접근성 트리 기반으로 실제 브라우저를 몰아 **끝까지 동작 검증**(로그인 게이트 통과·페이지 렌더·폴링 확인 등).
- 링크: https://github.com/microsoft/playwright-mcp · 문서 https://playwright.dev/docs/getting-started-mcp
- 설치: ⚠ **repo README에서 정확한 패키지명/명령 최종 확인** (대체로 `@playwright/mcp` 계열 `claude mcp add` 형태).

---

## TIER 3 — 참고 (도입 전 품질 평가 필수)

- 한국주식 분석 MCP(전략·아이디어 참고용, 실측 근거는 우리 자체 전진검증이 우선):
  - https://github.com/Mrbaeksang/korea-stock-analyzer-mcp (6대 투자대가 전략)
  - https://github.com/jjlabsio/korea-stock-mcp
- OpenAPI+ → REST 마이그레이션 함정(토큰·TR limit·WebSocket) 커뮤니티 가이드:
  - https://algolab.co.kr/blog/kiwoom-rest-api-algotrading-guide-2026

---

## ⚠ 하지 말 것 / 주의

- **https://github.com/breadum/kiwoom** = 구 OpenAPI+ (ActiveX·32bit·윈도우 전용). **REST 전환엔 역행** — 쓰지 말 것.
- **https://github.com/dongbin300/KiwoomRestApi.Net** = .NET 래퍼. 우리 스택(Python)이 아니라 **참고만**.
- **https://mcpmarket.com/tools/skills/kiwoom-stock-trading-api** (Kiwoom Claude Code Skill) = 존재하나 **품질 미검증**. 도입 전 소스 확인.
- **모든 커뮤니티 MCP/skill은 도입 전 검증**: 진짜 실행되나 · 최신인가 · **주문 오작동 없나**. 특히 주문 권한 MCP는 계좌 사고 위험.
- **키움 토큰 IP 고정** 재확인(STEP 0).

---

## 이미 갖춘 것 (추가 설치 불필요)

Claude Code superpowers 스킬군: `brainstorming`·`test-driven-development`·`systematic-debugging`·**`verification-before-completion`**. 컨버전 같은 대공사에선 이게 핵심 — 감으로 짜지 말고 **검증하며 진행**.

---

## 시작 전 체크리스트

- [ ] 키움 포털 가입 + App/Secret 키 발급(모의+실전), `.env` 저장
- [ ] 서버/클라이언트 IP 고정 확인(토큰 IP 제약)
- [ ] Context7 MCP 설치(✅ 명령 위)
- [ ] Playwright MCP 설치(repo README 확인)
- [ ] 키움 MCP 설치 — **read-only + 모의 키로 먼저**, 정상 조회 확인 후 실전
- [ ] Tier 3는 각 repo README·소스 훑어 품질 판단 후 선택 도입

---

## 출처 (검색 확인)

- 키움 REST 포털: https://openapi.kiwoom.com/
- kiwoom-mcp: https://glama.ai/mcp/servers/java-jaydev/kiwoom-mcp
- Context7: https://github.com/upstash/context7
- Playwright MCP: https://github.com/microsoft/playwright-mcp · https://playwright.dev/docs/getting-started-mcp
- korea-stock-analyzer-mcp: https://github.com/Mrbaeksang/korea-stock-analyzer-mcp
- korea-stock-mcp: https://github.com/jjlabsio/korea-stock-mcp
- 키움 REST 가이드(커뮤니티): https://algolab.co.kr/blog/kiwoom-rest-api-algotrading-guide-2026
