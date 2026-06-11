import { NextResponse } from "next/server";

import { buildStockReport, NotFoundError, UnreachableError } from "@/lib/stock/report";

// 온디맨드 종목 분석 — 요청 시 네이버 공개 API를 병렬 호출해 룰베이스 리포트 생성.
// 같은 종목 동시 조회는 CDN(s-maxage=180)이 흡수: 함수 실행은 종목당 ~3분에 1회.
const CACHE_HEADER = "public, s-maxage=180, stale-while-revalidate=600";

export const dynamic = "force-dynamic";

/**
 * GET /api/stock/{code}
 * 외부 공개 · 읽기 전용. 종목 분석 리포트
 * (주가현황·기술·수급·재무·재료뉴스·이벤트·판정). 시크릿 미사용.
 */
export async function GET(
  _req: Request,
  { params }: { params: { code: string } }
) {
  const code = params.code;
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "종목코드는 6자리 숫자여야 합니다." } },
      { status: 400 }
    );
  }
  try {
    const report = await buildStockReport(code);
    return NextResponse.json(report, { headers: { "Cache-Control": CACHE_HEADER } });
  } catch (e) {
    if (e instanceof NotFoundError) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "해당 코드의 종목을 찾을 수 없습니다." } },
        { status: 404 }
      );
    }
    if (e instanceof UnreachableError) {
      return NextResponse.json(
        { error: { code: "NAVER_UNREACHABLE", message: "네이버 데이터 응답이 없습니다. 잠시 후 다시 시도해 주세요." } },
        { status: 502 }
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "리포트 생성 중 오류가 발생했습니다." } },
      { status: 500 }
    );
  }
}
