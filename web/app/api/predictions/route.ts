import { NextResponse } from "next/server";

import { getPredictions } from "@/lib/predictions/repository";

// 엣지 캐시 + CORS(외부 코드/브라우저에서 사용 가능). 읽기 전용.
const HEADERS = {
  "Cache-Control": "public, s-maxage=30, stale-while-revalidate=300",
  "Access-Control-Allow-Origin": "*",
};

/**
 * GET /api/predictions
 * 외부 공개 · 읽기 전용. 내일 상승 예측(잠정 랭킹 + 종가베팅 후보).
 */
export async function GET() {
  return NextResponse.json(getPredictions(), { headers: HEADERS });
}
