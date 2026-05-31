/** KST 기준 시장 국면. */
export type MarketPhase = "pre" | "intraday" | "locked" | "closed";

/** KST 요일·분(0~) 추출 (사용자 시간대 무관). */
function kstWeekdayMinutes(now: Date): { weekday: string; mins: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return {
    weekday: get("weekday"),
    mins: parseInt(get("hour"), 10) * 60 + parseInt(get("minute"), 10),
  };
}

/**
 * 종가베팅 예측 관점의 시장 국면:
 * - pre: 개장 전 / locked: 14:20~마감(종가베팅 확정) / intraday: 09:00~14:20(잠정) / closed: 장외·주말
 */
export function marketPhaseKST(now: Date = new Date()): MarketPhase {
  const { weekday, mins } = kstWeekdayMinutes(now);
  if (!["Mon", "Tue", "Wed", "Thu", "Fri"].includes(weekday)) return "closed";
  if (mins < 9 * 60) return "pre";
  if (mins < 14 * 60 + 20) return "intraday";
  if (mins <= 15 * 60 + 30) return "locked"; // 14:20~15:30 종가베팅 확정 구간
  return "closed";
}

/** 한국 증시 장중 여부 (KST 기준, 사용자 시간대와 무관). */
export function isMarketOpenKST(now: Date = new Date()): boolean {
  // KST 요일·시·분을 사용자 로컬 시간대와 무관하게 산출
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const wd = get("weekday"); // Mon, Tue, ...
  const hour = parseInt(get("hour"), 10);
  const minute = parseInt(get("minute"), 10);

  const isWeekday = ["Mon", "Tue", "Wed", "Thu", "Fri"].includes(wd);
  const mins = hour * 60 + minute;
  // 정규장 09:00~15:30 (publish cron 9-15시 주기와 일치)
  const open = mins >= 9 * 60 && mins <= 15 * 60 + 30;
  return isWeekday && open;
}
