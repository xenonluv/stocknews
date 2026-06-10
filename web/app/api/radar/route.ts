import { NextResponse } from "next/server";

import { getRadar } from "@/lib/radar/repository";

// 엣지 캐시: 다수 동시 폴링도 CDN이 응답, 실제 함수는 ~30초당 1회.
// 새 배포 시 Vercel이 캐시를 자동 무효화하므로 데이터는 배포 즉시 신선.
const CACHE_HEADER = "public, s-maxage=30, stale-while-revalidate=300";

/**
 * GET /api/radar
 * 외부 공개 · 읽기 전용. 이벤트 매집 레이더 전체 상태
 * (D-10 이벤트 + 수상 종목 + 판정 파라미터).
 */
export async function GET() {
  try {
    return NextResponse.json(getRadar(), {
      headers: { "Cache-Control": CACHE_HEADER },
    });
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "레이더 조회 중 오류가 발생했습니다." } },
      { status: 500 }
    );
  }
}
