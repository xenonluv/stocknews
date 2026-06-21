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

/**
 * 한국어 금액 단위 문자열 → 억(number). "468,099백만"→4681, "5,004억"→5004, "1,753조 8,836억"→17538836.
 * 네이버 totalInfos의 accumulatedTradingValue("백만")·marketValue("억") 등 단위 접미사를 정규화한다.
 * num()은 백만/억/조 접미사를 못 떼어 NaN이 되므로 금액 전용 파서가 별도로 필요하다. 실패 시 null.
 * ⚠ 단위 접미사가 **없는** 숫자는 단위가 모호(원? 백만?)하므로 null을 반환한다 — 네이버 totalInfos는
 * 항상 단위가 붙어 오고, 만약 포맷이 바뀌어 단위가 빠지면 원으로 단정해 ~100만배 오차를 내느니
 * "—"로 비우는 편이 안전하다(무신호 < 거짓 소액).
 */
export function parseEok(s: unknown): number | null {
  if (typeof s === "number") return Number.isFinite(s) ? s : null;
  if (typeof s !== "string") return null;
  const str = s.replace(/,/g, "").replace(/\s+/g, "");
  if (!str || str === "-" || str === "N/A") return null;
  let eok = 0;
  let matched = false;
  for (const [unit, mul] of [["조", 10000], ["억", 1], ["백만", 0.01], ["만", 0.0001]] as const) {
    const m = str.match(new RegExp(`(-?\\d+(?:\\.\\d+)?)${unit}`));
    if (m) {
      eok += parseFloat(m[1]) * mul;
      matched = true;
    }
  }
  return matched ? Math.round(eok * 100) / 100 : null;
}

/** 거래대금(억) 표시 문자열. null→"—", 0<v<1→"1억 미만"(0억으로 거짓표기 방지), else 반올림+"억". */
export function formatEok(v: number | null): string {
  if (v === null) return "—";
  if (v <= 0) return "0억";
  if (v < 1) return "1억 미만";
  return `${Math.round(v).toLocaleString("ko-KR")}억`;
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
