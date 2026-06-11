import { NextRequest, NextResponse } from "next/server";

import { fetchAutocomplete } from "@/lib/stock/naver";

// 자동완성 프록시 — 브라우저는 CSP(connect-src 'self') 때문에 네이버를 직접
// 호출할 수 없어 이 라우트를 경유한다. 종목 목록은 변동이 드물어 길게 캐시.
const CACHE_HEADER = "public, s-maxage=3600, stale-while-revalidate=86400";

export const dynamic = "force-dynamic";

/**
 * GET /api/stock/search?q=삼성
 * 외부 공개 · 읽기 전용. 국내 종목명/코드 자동완성 (상위 8건).
 */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q) {
    return NextResponse.json({ items: [] }, { headers: { "Cache-Control": CACHE_HEADER } });
  }
  if (q.length > 30) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "검색어가 너무 깁니다." } },
      { status: 400 }
    );
  }
  try {
    const items = (await fetchAutocomplete(q)).slice(0, 8).map((it) => ({
      code: String(it.code),
      name: String(it.name),
      market: String(it.typeCode ?? ""),
    }));
    return NextResponse.json({ items }, { headers: { "Cache-Control": CACHE_HEADER } });
  } catch {
    return NextResponse.json(
      { error: { code: "NAVER_UNREACHABLE", message: "종목 검색 응답이 없습니다. 잠시 후 다시 시도해 주세요." } },
      { status: 502 }
    );
  }
}
