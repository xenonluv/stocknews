import { NextResponse } from "next/server";

import { getSignal } from "@/lib/signals/repository";
import type { ApiItemResponse, ApiErrorResponse } from "@/types/api";
import type { SignalPost } from "@/types/signal";

export const dynamic = "force-dynamic";

/**
 * GET /api/signals/{post_id}
 * 외부 공개 · 읽기 전용. 단일 시그널 상세.
 */
export async function GET(
  _req: Request,
  { params }: { params: { post_id: string } }
) {
  const signal = getSignal(params.post_id);

  if (!signal) {
    const err: ApiErrorResponse = {
      error: { code: "NOT_FOUND", message: "해당 시그널을 찾을 수 없습니다." },
    };
    return NextResponse.json(err, { status: 404 });
  }

  const body: ApiItemResponse<SignalPost> = { data: signal };
  return NextResponse.json(body);
}
