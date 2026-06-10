import type { CalibBin } from "@/types/performance";

const LABELS: Record<string, string> = {
  "40-60": "낮음 (40~59점)",
  "60-75": "중간 (60~74점)",
  "75-101": "높음 (75점+)",
};

/** 점수대별 실측 적중률 — 표본 미달 구간은 숨기지 않고 "수집 중" 명시 (정직성) */
export function CalibrationTable({ bins }: { bins: CalibBin[] }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <h3 className="mb-3 text-sm font-semibold">점수대별 실측 적중률</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted-foreground">
            <th className="pb-2 font-medium">수상함 점수대</th>
            <th className="pb-2 font-medium tabular-nums">표본</th>
            <th className="pb-2 font-medium">실측 적중률</th>
          </tr>
        </thead>
        <tbody>
          {bins.map((b) => (
            <tr key={`${b.lo}-${b.hi}`} className="border-t border-white/5">
              <td className="py-2">{LABELS[`${b.lo}-${b.hi}`] ?? `${b.lo}~${b.hi - 1}점`}</td>
              <td className="py-2 tabular-nums text-muted-foreground">{b.n}건</td>
              <td className="py-2">
                {b.valid && b.actual_rate !== null ? (
                  <span
                    className={`font-semibold tabular-nums ${b.actual_rate >= 50 ? "text-up" : "text-down"}`}
                  >
                    {b.actual_rate}%
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    수집 중 (20건 이상 누적 시 표시)
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-muted-foreground">
        표본이 충분한 구간의 실측 적중률은 수상 종목 카드에 함께 표시됩니다.
      </p>
    </div>
  );
}
