// 네이버 API 응답의 "표시용 문자열" 수치 파서 모음 (순수 함수).
// 예: "24.25배" → 24.25, "-3,840,270" → -3840270, "47.61%" → 47.61

/** 콤마·단위 접미사("배","원","%")가 붙은 수치 문자열 → number. 실패 시 null. */
export function num(s: unknown): number | null {
  if (typeof s === "number") return Number.isFinite(s) ? s : null;
  if (typeof s !== "string") return null;
  const cleaned = s.replace(/,/g, "").replace(/[배원%주]+$/u, "").trim();
  if (!cleaned || cleaned === "-" || cleaned === "N/A") return null;
  const v = Number(cleaned.replace(/^\+/, ""));
  return Number.isFinite(v) ? v : null;
}

/** 뉴스 제목의 HTML 태그 제거 + 기본 엔티티 디코드. */
export function cleanText(s: unknown): string {
  if (typeof s !== "string") return "";
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
}

/** "YYYYMMDDHHmm" → KST 기준 경과 일수. 파싱 실패 시 null. */
export function ageDaysKST(dt: unknown, now = new Date()): number | null {
  if (typeof dt !== "string" || !/^\d{12}/.test(dt)) return null;
  const utcMs = Date.UTC(
    Number(dt.slice(0, 4)),
    Number(dt.slice(4, 6)) - 1,
    Number(dt.slice(6, 8)),
    Number(dt.slice(8, 10)) - 9, // KST → UTC
    Number(dt.slice(10, 12))
  );
  return (now.getTime() - utcMs) / 86_400_000;
}

/** Date → "YYYY-MM-DD HH:mm KST" (서울 기준). */
export function formatKST(d = new Date()): string {
  const kst = new Date(d.getTime() + 9 * 3_600_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${kst.getUTCFullYear()}-${p(kst.getUTCMonth() + 1)}-${p(kst.getUTCDate())} ` +
    `${p(kst.getUTCHours())}:${p(kst.getUTCMinutes())} KST`
  );
}

/** Date → "YYYYMMDD" (서울 기준). */
export function ymdKST(d = new Date()): string {
  const kst = new Date(d.getTime() + 9 * 3_600_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${kst.getUTCFullYear()}${p(kst.getUTCMonth() + 1)}${p(kst.getUTCDate())}`;
}

/** "YYYY-MM-DD" 이벤트 날짜 → 오늘(KST) 기준 D-day. */
export function ddayKST(dateStr: string, now = new Date()): number {
  const today = ymdKST(now);
  const t = Date.UTC(
    Number(today.slice(0, 4)),
    Number(today.slice(4, 6)) - 1,
    Number(today.slice(6, 8))
  );
  const [y, m, d] = dateStr.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - t) / 86_400_000);
}
