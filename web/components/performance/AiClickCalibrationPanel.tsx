import { Sparkles } from "lucide-react";

import type { AiClickPerformance } from "@/types/performance";

const BAND_LABELS: Record<string, string> = {
  "0-40": "40% 미만",
  "40-46": "40~45%",
  "46-50": "46~49%",
  "50-54": "50~53%",
  "54-60": "54~59%",
  "60-101": "60%+",
};

/**
 * AI '클릭 예측' 임계 보정 — 사용자가 'AI분석하기'를 누른 모든 종목의 AI 상승확률을
 * 익일 등락으로 채점해 ① 확률 구간별 실측 상승률 ② 최적 방향 임계 권고를 누적 제시한다.
 * 임계 자동 적용은 하지 않는다(권고치 확인 후 ai.ts 수동 변경 — 재앵커링 방지).
 */
export function AiClickCalibrationPanel({ data }: { data: AiClickPerformance }) {
  const sweep = data.threshold_sweep;
  const rec = sweep?.recommended_up_min ?? null;

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
        <Sparkles className="size-3.5 text-warning" aria-hidden /> AI 클릭 예측 임계 보정
      </h3>
      <p className="mb-3 text-[11px] text-muted-foreground">
        &quot;AI분석하기&quot;를 누른 모든 종목의 상승확률을 익일 등락으로 채점합니다 · 구간당 {data.min_n}건
        이상 쌓이면 실측 상승률을, 전체 {sweep?.min_n ?? 30}건 이상이면 권고 임계를 표시합니다.
      </p>

      {data.n === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">
          수집 중 — 버튼을 누른 다음 거래일부터 채점됩니다. (현재 누적 0건)
        </p>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs tabular-nums">
            <span>
              누적 표본 <strong>{data.n}건</strong>
            </span>
            {data.avg_prob !== null && data.hit_rate !== null && (
              <span>
                평균 예측 <strong>{data.avg_prob}%</strong> vs 실측 상승{" "}
                <strong>{data.hit_rate}%</strong>
              </span>
            )}
            {data.brier !== null && (
              <span title="낮을수록 좋음 · 0.25 = 항상 50%라 답한 무정보 기준선">
                Brier <strong>{data.brier}</strong>
              </span>
            )}
          </div>

          {/* 권고 임계 카드 */}
          <div className="mb-4 rounded-md border border-white/10 bg-white/[0.02] p-3 text-xs">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-muted-foreground">현재 상승 임계</span>
              <span className="font-semibold tabular-nums">≥ {sweep?.current_up_min ?? 54}%</span>
              <span className="text-muted-foreground">데이터 권고</span>
              {rec !== null ? (
                <span className="font-semibold tabular-nums text-warning">≥ {rec}%</span>
              ) : (
                <span className="text-muted-foreground">
                  수집 중 ({sweep?.min_n ?? 30}건 이상 누적 시 산출)
                </span>
              )}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              권고 = &quot;상승 예측 = probUp ≥ T&quot;의 균형정확도가 가장 높은 T. 자동 적용하지 않으며,
              확인 후 직접 조정합니다(상승 {sweep?.current_up_min ?? 54} / 하락{" "}
              {sweep?.current_down_max ?? 46}).
            </p>
          </div>

          {/* 확률 구간 보정표 */}
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="pb-2 font-medium">예측 구간</th>
                <th className="pb-2 text-right font-medium">표본</th>
                <th className="pb-2 text-right font-medium">평균 예측</th>
                <th className="pb-2 text-right font-medium">실측 상승률</th>
              </tr>
            </thead>
            <tbody>
              {data.prob_bands.map((b) => {
                const show = b.valid && b.actual_rate !== null;
                return (
                  <tr key={`${b.lo}-${b.hi}`} className="border-t border-white/5">
                    <td className="py-1.5 tabular-nums">
                      {BAND_LABELS[`${b.lo}-${b.hi}`] ?? `${b.lo}~${b.hi - 1}%`}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-muted-foreground">{b.n}</td>
                    <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                      {b.avg_prob !== null ? `${b.avg_prob}%` : "—"}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">
                      {show ? (
                        <span
                          className={`font-semibold ${
                            b.actual_rate! > 50
                              ? "text-up"
                              : b.actual_rate! < 50
                                ? "text-down"
                                : "text-muted-foreground"
                          }`}
                        >
                          {b.actual_rate}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">수집 중</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* 임계 후보별 성적(권고 활성 시) */}
          {rec !== null && sweep.rows.length > 0 && (
            <div className="mt-4">
              <h4 className="mb-1 text-xs font-semibold">임계 후보별 성적</h4>
              <p className="mb-2 text-[11px] text-muted-foreground">
                실제 상승 {sweep.pos}건 / 하락·보합 {sweep.neg}건 기준. 균형정확도가 가장 높은 임계를
                권고합니다.
              </p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="pb-1.5 font-medium">임계</th>
                    <th className="pb-1.5 text-right font-medium">상승예측</th>
                    <th className="pb-1.5 text-right font-medium">정밀도</th>
                    <th className="pb-1.5 text-right font-medium">재현율</th>
                    <th className="pb-1.5 text-right font-medium">균형정확도</th>
                  </tr>
                </thead>
                <tbody>
                  {sweep.rows.map((r) => (
                    <tr
                      key={r.t}
                      className={`border-t border-white/5 tabular-nums ${
                        r.t === rec ? "bg-warning/5 font-semibold" : ""
                      }`}
                    >
                      <td className="py-1.5">≥ {r.t}%</td>
                      <td className="py-1.5 text-right text-muted-foreground">{r.n_pred_up}건</td>
                      <td className="py-1.5 text-right">
                        {r.precision !== null ? `${r.precision}%` : "—"}
                      </td>
                      <td className="py-1.5 text-right">
                        {r.recall !== null ? `${r.recall}%` : "—"}
                      </td>
                      <td className="py-1.5 text-right">
                        {r.balanced_acc !== null ? `${r.balanced_acc}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">{data.disclaimer}</p>
        </>
      )}
    </section>
  );
}
