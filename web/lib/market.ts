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
