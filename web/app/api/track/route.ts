import { NextRequest, NextResponse } from "next/server";

import { kvCommand, kvConfigured } from "@/lib/kv";

// 추적 종목 watchlist — Upstash Redis(KV) SET에 종목코드 저장.
// POST /api/track {code}  → 추적 추가(SADD)   | GET /api/track?code= → 추적여부(SISMEMBER)
// Mac cron(track_eval.py)이 이 SET을 읽어 매일 종합판정+Kimi 기록·익일 평가.
export const dynamic = "force-dynamic";

const KEY = "track:watchlist";
const MAX_TRACK = 50; // 무분별 증가·Kimi 비용 폭주 방지(매일 종목수만큼 /ai 호출)

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code") || "";
  if (!/^\d{6}$/.test(code)) return bad("invalid code");
  if (!kvConfigured()) return NextResponse.json({ tracked: false, configured: false });
  try {
    const r = await kvCommand(["SISMEMBER", KEY, code]);
    return NextResponse.json({ tracked: r === 1, configured: true });
  } catch {
    return NextResponse.json({ tracked: false, configured: true });
  }
}

export async function POST(req: NextRequest) {
  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return bad("invalid body");
  }
  // body.code는 런타임에 임의 타입(req.json()=unknown) — 숫자/배열/객체면 .trim()이 throw해
  // 500이 되므로 문자열만 통과시키고 나머지는 정규식에서 400으로 거른다.
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!/^\d{6}$/.test(code)) return bad("invalid code");
  if (!kvConfigured()) return bad("KV not configured", 503);
  try {
    const already = await kvCommand(["SISMEMBER", KEY, code]);
    if (already !== 1) {
      const n = (await kvCommand(["SCARD", KEY])) as number;
      if (typeof n === "number" && n >= MAX_TRACK) {
        return bad(`추적 목록이 가득 찼습니다(최대 ${MAX_TRACK}). 기존 종목을 정리해 주세요.`, 409);
      }
      await kvCommand(["SADD", KEY, code]);
    }
    return NextResponse.json({ tracked: true });
  } catch (e) {
    return bad(`추적 저장 실패: ${String(e).slice(0, 80)}`, 502);
  }
}
