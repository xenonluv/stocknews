import { NextResponse } from "next/server";

import { getAlpha } from "@/lib/alpha/repository";

// 엣지 캐시: 폴링은 CDN이 응답. 새 배포(publish_alpha push) 시 자동 무효화.
const CACHE_HEADER = "public, s-maxage=30, stale-while-revalidate=300";

/** GET /api/alpha — 알파 사이드카 상태(오늘 movers 정량+LLM 판단 + calibration). 읽기 전용. */
export async function GET() {
  try {
    return NextResponse.json(getAlpha(), { headers: { "Cache-Control": CACHE_HEADER } });
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "알파 조회 중 오류가 발생했습니다." } },
      { status: 500 }
    );
  }
}
