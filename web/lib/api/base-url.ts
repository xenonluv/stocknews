import { headers } from "next/headers";

/**
 * 서버 컴포넌트에서 자기 API를 호출할 때 쓰는 절대 URL 베이스.
 * 우선순위: NEXT_PUBLIC_SITE_URL > 요청 헤더(host/proto) > localhost.
 */
export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  const h = headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
