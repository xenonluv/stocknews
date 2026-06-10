import type { PerformanceData } from "@/types/performance";

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "up" | "down" | "none";
}) {
  const cls =
    accent === "up" ? "text-up" : accent === "down" ? "text-down" : "text-foreground";
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${cls}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground tabular-nums">{sub}</p>}
    </div>
  );
}

/** 핵심 지표 4카드 — 표본 부족 시 "수집 중"을 정직하게 표시 */
export function StatCards({ data }: { data: PerformanceData }) {
  const s = data.summary;
  const has = s.n > 0;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat
        label="누적 적중률 (익일 종가↑)"
        value={has && s.hit_rate !== null ? `${s.hit_rate}%` : "수집 중"}
        sub={`표본 ${s.n}건 · ${s.tracking_days}일째 추적`}
        accent={has && (s.hit_rate ?? 0) >= 50 ? "up" : "none"}
      />
      <Stat
        label="평균 수익률 (익일 종가)"
        value={has && s.avg_return !== null ? `${s.avg_return > 0 ? "+" : ""}${s.avg_return}%` : "—"}
        accent={!has ? "none" : (s.avg_return ?? 0) > 0 ? "up" : "down"}
      />
      <Stat
        label="익일 고가 +3% 도달률"
        value={has && s.high3_rate !== null ? `${s.high3_rate}%` : "—"}
        sub="장중 익절 기회 비율"
      />
      <Stat
        label="자가 튜닝"
        value={data.weights.tuned ? "활성" : "대기"}
        sub={
          data.weights.tuned
            ? `표본 ${data.weights.basis_n}건 기반`
            : `표본 ${data.weights.tune_min_samples}건 누적 시 활성 (현재 ${s.n})`
        }
        accent={data.weights.tuned ? "up" : "none"}
      />
    </div>
  );
}
