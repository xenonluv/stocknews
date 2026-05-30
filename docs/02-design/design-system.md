# 디자인 시스템 사양 (Phase 5)

> **스택**: Next.js(App Router) + TypeScript + Tailwind CSS + shadcn/ui + Pretendard
> **콘셉트**: 다크 금융 대시보드 · **한국 시장 색 관례(상승=빨강 / 하락=파랑)**
> **SSOT**: 디자인 토큰은 `web/app/globals.css`, 컴포넌트 사양은 `prompts/09_디자이너_디자인시스템.md`

## 1. 디자인 토큰 (Design Tokens)

CSS 변수 기반(shadcn 규격, 공백 구분 HSL). `web/app/globals.css`의 `:root`에 정의.

### 표면 (다크)
| 토큰 | HSL | HEX | 용도 |
|------|-----|-----|------|
| `--background` | `222 29% 6%` | `#0B0E14` | 페이지 배경 |
| `--card` | `218 25% 11%` | `#151A23` | 카드 표면 |
| `--border` | `219 21% 17%` | `#232A36` | 보더/구분선 |
| `--foreground` | `224 26% 92%` | `#E6E9EF` | 본문 텍스트 |
| `--muted-foreground` | `214 14% 65%` | `#9AA4B2` | 보조 텍스트 |

### 시그널 시맨틱 색 (⚠️ 한국 관례)
| 토큰 | HEX | 의미 |
|------|-----|------|
| `--up` | `#F23645` (빨강) | **상승/긍정** (= 브랜드 `--primary`) |
| `--down` | `#2962FF` (파랑) | **하락/부정** |
| `--warning` | `#FFB020` (앰버) | 과다상승/과열 경고 |
| `--neutral` | `#6B7280` (그레이) | 분석불가/중립 |
| `--safe` | `#1FAE6F` (그린) | 눌림목/저점 안전 진입 |

> 미국과 반대 관례. 빨강=상승, 파랑=하락. 위반은 치명적 오류.

### 기타
- **타이포**: Pretendard Variable (CDN @import), 수치는 `tabular-nums`.
- **라운드**: `--radius: 1rem` (카드 `rounded-lg`).

## 2. 컴포넌트 (Core + Composite)

### shadcn/ui 코어 (`web/components/ui/`)
- `Button` — variant: default/outline/secondary/ghost/link
- `Card` — Header/Content/Footer 구성
- `Badge` — variant에 시그널 시맨틱(up/down/warning/neutral/safe) 추가

### 시그널 합성 컴포넌트 (`web/components/signal/`)
| 컴포넌트 | 역할 | 접근성 |
|----------|------|--------|
| `SignalCard` | 매매 시그널 게시 카드(전체 조합) | 시맨틱 마크업, `<time>` |
| `ProbabilityGauge` | 상승확률 링 게이지(빨강) | `role="img"` + aria-label |
| `MarketStatusBadge` | 시장 위치 뱃지 | 색 + **아이콘 병행**(색맹 대응) |
| `DisclaimerNote` | 투자 면책 고지 | — |

### props 계약 (`SignalCard`)
```ts
interface SignalCardProps {
  targetStock: string;
  signalProbability: string;          // "88%"
  positionType: "눌림목" | "저점";    // CEO 승인 게이트상 안전 타점만
  headline: string;
  summary: string;
  disclaimer?: string;
  publishedAt: string;
}
```
타입 SSOT: `web/types/signal.ts` (schemas/06_CEO.schema.json과 정합).

## 3. 파이프라인 연결
`CEO(APPROVED) → 디자이너(이 사양) → 팀원5(데이터 바인딩·게시) → 팀원6(GET /api/signals)`

팀원5는 디자인을 **재정의하지 않고** 승인 데이터를 props로 바인딩만 한다.

## 4. 체크리스트
- [x] 디자인 토큰(색/타이포/라운드)
- [x] 코어 컴포넌트(Button/Card/Badge)
- [x] 합성 컴포넌트(SignalCard/ProbabilityGauge/MarketStatusBadge/DisclaimerNote)
- [x] 한국 색 관례 적용 + 색맹 접근성(아이콘 병행)
- [x] 면책 고지 기본 포함
- [ ] Storybook 컴포넌트 카탈로그(후순위)
- [ ] 라이트 모드(현재 다크 전용)

## Next Phase
Phase 6: UI 구현 + API 연동 — 컴포넌트 준비 완료, 실제 화면/`/api/signals` 구현.
