// Upstash Redis(KV) REST 최소 클라이언트 — 명령을 JSON 배열 본문으로 보내 임의 값(JSON 직렬화 등)을
// 경로 이스케이프 걱정 없이 안전하게 전송한다. /api/track(SADD/SISMEMBER)와
// /api/stock/[code]/ai(HSETNX 예측 기록)가 공유. 시크릿은 이미 Vercel에 있는 KV_REST_API_*뿐
// (신규 시크릿 없음 — AI 라우트의 무시크릿 동작은 KV 미설정 시 호출자가 skip하여 유지).

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

/** KV 쓰기 토큰이 설정돼 있는지 — 미설정이면 호출자는 기록을 조용히 건너뛴다(무시크릿 보장). */
export function kvConfigured(): boolean {
  return Boolean(KV_URL && KV_TOKEN);
}

const KV_TIMEOUT_MS = 5_000; // KV 장애 시 본 응답(특히 AI 라우트)이 무한 대기하지 않도록 상한

/**
 * 단일 Redis 명령 실행. 예: kvCommand(["HSETNX", "aipred:20260620", "005930", "{...}"]).
 * 본문(JSON 배열) 전송이라 값에 특수문자가 있어도 안전. 미설정·HTTP 오류·KV 오류·타임아웃은 throw
 * (호출부가 처리 — AI 라우트는 fail-safe로 삼키고, track 라우트는 502로 응답).
 */
export async function kvCommand(args: (string | number)[]): Promise<unknown> {
  if (!KV_URL || !KV_TOKEN) throw new Error("KV not configured");
  const res = await fetch(KV_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
    cache: "no-store",
    signal: AbortSignal.timeout(KV_TIMEOUT_MS), // 행(hang) 차단 — 느린 KV가 본 응답을 볼모로 잡지 못하게
  });
  if (!res.ok) throw new Error(`KV ${res.status}`);
  const j = (await res.json()) as { result?: unknown; error?: string };
  if (j.error) throw new Error(`KV ${j.error}`);
  return j.result;
}
