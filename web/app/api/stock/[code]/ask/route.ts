import { NextRequest, NextResponse } from "next/server";

import { AiConfigError, AiUnavailableError } from "@/lib/stock/ai";
import { answerQuestion } from "@/lib/stock/ask";
import { NotFoundError, UnreachableError } from "@/lib/stock/report";

// POST /api/stock/{code}/ask — 사용자 자유질문에 Kimi가 그 종목의 데이터·뉴스·찌라시 원문만
// 근거로 답한다(RAG + 사후 출처대조). 질문마다 답이 달라 CDN 캐시 불가 → POST·force-dynamic.
// 비용: 질문 1건 = Kimi 1회. 개인용(프론트 게이트 뒤)이라 IP 레이트리밋은 현재 과설계.
export const dynamic = "force-dynamic";
export const maxDuration = 300; // kimi 응답 여유 (thinking enabled 대비)

const MAX_Q = 300;

export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  const code = params.code;
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "종목코드는 6자리 숫자여야 합니다." } },
      { status: 400 }
    );
  }
  let question = "";
  try {
    const body = (await req.json()) as { question?: unknown };
    question = typeof body?.question === "string" ? body.question.trim() : "";
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "요청 본문(JSON)을 읽을 수 없습니다." } },
      { status: 400 }
    );
  }
  if (question.length < 2 || question.length > MAX_Q) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: `질문은 2~${MAX_Q}자로 입력해 주세요.` } },
      { status: 400 }
    );
  }

  try {
    const answer = await answerQuestion(code, question);
    return NextResponse.json(answer, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof NotFoundError) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "해당 코드의 종목을 찾을 수 없습니다." } },
        { status: 404 }
      );
    }
    if (e instanceof UnreachableError) {
      return NextResponse.json(
        { error: { code: "NAVER_UNREACHABLE", message: "데이터 응답이 없습니다. 잠시 후 다시 시도해 주세요." } },
        { status: 502 }
      );
    }
    if (e instanceof AiConfigError) {
      return NextResponse.json(
        { error: { code: "AI_NOT_CONFIGURED", message: "AI를 일시적으로 사용할 수 없습니다." } },
        { status: 503 }
      );
    }
    if (e instanceof AiUnavailableError) {
      return NextResponse.json(
        { error: { code: "AI_UNAVAILABLE", message: "AI 답변을 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해 주세요." } },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "답변 생성 중 오류가 발생했습니다." } },
      { status: 500 }
    );
  }
}
