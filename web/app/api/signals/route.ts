import { NextRequest, NextResponse } from "next/server";

import { listSignals } from "@/lib/signals/repository";
import type { ApiListResponse, ApiErrorResponse } from "@/types/api";
import type { SignalPost } from "@/types/signal";

export const dynamic = "force-dynamic";

/**
 * GET /api/signals
 * 외부 공개 · 읽기 전용. CEO 승인 시그널 목록.
 * Query: ?stock=종목명 · ?page=1 · ?limit=20
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const stock = sp.get("stock") ?? undefined;
  const page = clampInt(sp.get("page"), 1, 1, 10_000);
  const limit = clampInt(sp.get("limit"), 20, 1, 100);

  try {
    const { items, total } = listSignals({ stock, page, limit });
    const body: ApiListResponse<SignalPost> = {
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
    return NextResponse.json(body);
  } catch {
    const err: ApiErrorResponse = {
      error: { code: "INTERNAL_ERROR", message: "시그널 목록 조회 중 오류가 발생했습니다." },
    };
    return NextResponse.json(err, { status: 500 });
  }
}

function clampInt(
  raw: string | null,
  fallback: number,
  min: number,
  max: number
): number {
  const n = raw ? parseInt(raw, 10) : NaN;
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
