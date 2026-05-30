# Phase 6 QA 결과 — UI 구현 + API 연동

> 검증 환경: WSL Node 20.20.2, Next.js 14.2.35, `next start` 실서버 + curl (Zero Script QA)

## 빌드
- `next build` ✓ 컴파일 성공, 타입체크 통과, ESLint 통과.
- 라우트: `/`(ƒ), `/signals/[post_id]`(ƒ), `/api/signals`(ƒ), `/api/signals/[post_id]`(ƒ).

## API (팀원6, 읽기 전용) 런타임 검증

| 케이스 | 요청 | 결과 |
|--------|------|------|
| 목록 | `GET /api/signals` | ✅ `data[]` + `pagination` 반환, 게시시각 내림차순 |
| 필터(삼성) | `GET /api/signals?stock=삼성` | ✅ 삼성전자 1건 |
| 필터(현대) | `GET /api/signals?stock=현대` | ✅ 현대로템 1건 |
| 상세 | `GET /api/signals/POST_20260530_001` | ✅ 단일 `data` 반환 |
| 없음 | `GET /api/signals/NOPE` | ✅ HTTP 404 + `{error:{code:"NOT_FOUND"}}` |

> 한글 쿼리는 퍼센트 인코딩 필요(curl `--data-urlencode`). 브라우저/`URLSearchParams`는 자동 인코딩.

## 페이지(SSR) 검증
- `GET /` HTML에 `매매 시그널`·`삼성전자`·`현대로템` 포함 → 서버 컴포넌트가 실제 API를 fetch하여 렌더(하드코딩 제거 확인).
- 빈 상태/로딩(`loading.tsx`)/404(`not-found.tsx`) 처리 구현.

## 아키텍처 (skill 권장 준수)
```
컴포넌트(page) → services/signal.service → /api/signals → lib/signals/repository → data/signals.json
```
- 컴포넌트에서 직접 fetch 금지, 서비스 경유.
- 응답 표준 포맷(`ApiListResponse`/`ApiItemResponse`/`ApiErrorResponse`).
- repository = 단일 출처(PUBLISHED만, 운영 시 DB로 교체).

## 미결/후속
- [ ] 실데이터 연결: 팀원6 발행 → repository 저장소를 DB로 교체.
- [ ] OG 이미지(`og:image`) 동적 생성(현재 summary 카드만).

---

# Phase 7 QA 결과 — SEO + 보안 + 페이지네이션

> 검증: `next build`(exit 0) + `next start` 실서버 curl. superpowers `verification-before-completion` 적용.

## ① 보안 헤더 (`curl -I /`)
| 헤더 | 값 | 결과 |
|------|----|------|
| Content-Security-Policy | self + jsdelivr(폰트/스타일), `frame-ancestors 'none'`, `object-src 'none'` | ✅ |
| Strict-Transport-Security | `max-age=63072000; includeSubDomains; preload` | ✅ |
| X-Frame-Options | `DENY` | ✅ |
| X-Content-Type-Options | `nosniff` | ✅ |
| Referrer-Policy | `strict-origin-when-cross-origin` | ✅ |
| Permissions-Policy | `camera=(), microphone=(), geolocation=()` | ✅ |
| X-Powered-By | **부재**(`poweredByHeader:false`) | ✅ |

## ② OG/SEO 메타
- 홈: `og:title/description/url/site_name/locale(ko_KR)/type(website)` + `twitter:card` ✅
- 상세: `og:type=article`, `og:title="삼성전자 88% · 눌림목 — StockNews"`, `og:url`, `publishedTime` ✅
- `metadataBase` + title template(`%s — StockNews`), robots index/follow ✅

## ③ 페이지네이션 UI
- `?limit=1` → nav(`aria-label="페이지네이션"`) + 이전/다음 + 인디케이터 렌더 ✅
- **page=1 → 삼성전자, page=2 → 현대로템** : 페이지 이동이 콘텐츠를 실제로 변경 ✅
- `totalPages<=1`이면 미렌더(기본 limit 9에서는 숨김) ✅
- HTTP: `/`, `/signals/{id}`, `/?limit=1&page=2` 모두 200 ✅

> 비고: 원시 HTML에서 `1 / 2` 리터럴 grep은 React SSR의 텍스트 노드 분리(주석마커)로 매칭 실패했으나, page=1/2 콘텐츠 변경으로 기능 정상 증명.
