import type { TrackPerformance, TrackCell } from "@/types/performance";

/** 부호 있는 % (null=아직 성숙 안 됨 → '진행중'). */
function pct(v: number | null | undefined): string {
  return v == null ? "진행중" : `${v > 0 ? "+" : ""}${v}%`;
}

function Cell({ label, cell, minN }: { label: string; cell: TrackCell; minN: number }) {
  const valid = cell.n >= minN && cell.hit_rate != null;
  const hasFwd = cell.avg_d5 != null || cell.avg_d10 != null;
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      {valid ? (
        <p className="mt-1">
          <span className={`text-lg font-bold tabular-nums ${cell.hit_rate! >= 50 ? "text-up" : "text-down"}`}>
            {cell.hit_rate}%
          </span>
          <span className="ml-1 text-xs text-muted-foreground">
            ({cell.n}건{cell.avg_return != null ? ` · 익일평균 ${pct(cell.avg_return)}` : ""})
          </span>
        </p>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">수집 중 ({cell.n}건)</p>
      )}
      {hasFwd && (
        <p className="mt-0.5 text-[10px] text-muted-foreground tabular-nums">
          이후경로 {cell.fwd_n ?? 0}건 · D+5 {pct(cell.avg_d5)} · D+10 {pct(cell.avg_d10)}
        </p>
      )}
    </div>
  );
}

/**
 * 추적 종목 검증 패널 — /stock에서 📌 추적한 종목의 종합판정(룰) vs Kimi(AI) 익일 적중률을 누적 비교.
 * "룰만 강세 / AI만 강세"가 갈릴 때 실제로 누가 맞았는지(케이뱅크형 괴리)를 데이터로 보여준다.
 */
export function TrackPerformancePanel({ data }: { data: TrackPerformance }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <h3 className="mb-1 text-sm font-semibold">📌 추적 종목 — 종합판정(룰) vs Kimi(AI) 검증</h3>
      <p className="mb-3 text-[11px] text-muted-foreground">
        /stock에서 추적한 종목의 종합판정·AI 상승확률을 매일 기록하고, 익일(D+1) 적중 외에
        보유기간 경로(D+5·D+10·최고/최저)까지 추적합니다 ·
        현재 추적 {data.tracking.length}종목 · 평가 표본 {data.n}건
        {data.fwd_n != null ? ` (D+10 성숙 ${data.fwd_n}건)` : ""}
        {data.as_of ? ` · 기준 ${data.as_of}` : ""}
      </p>

      {data.n === 0 ? (
        <p className="text-xs text-muted-foreground">
          아직 평가된 추적 표본이 없습니다. 종목 검색 후 <span className="text-foreground">📌 추적</span>을 누르면
          다음 거래일부터 종합판정·AI 예측이 기록·검증됩니다.
        </p>
      ) : (
        <>
          <div className="mb-3 grid gap-2 sm:grid-cols-2">
            <Cell label="종합판정 '매수 계열'(강한매수·매수우위) 익일 적중률" cell={{ ...data.rule_buy, avg_return: null }} minN={data.min_n} />
            <Cell label={`Kimi ≥${data.ai_up_min}% (AI 상승) 익일 적중률`} cell={{ ...data.ai_up, avg_return: null }} minN={data.min_n} />
          </div>
          <p className="mb-1 text-[11px] font-medium text-muted-foreground">
            룰 vs AI가 갈릴 때 — 실제 익일 적중률
            {data.unknown_n ? (
              <span className="ml-1 font-normal text-muted-foreground/70">
                (4분면 {data.quad_n ?? 0}건 · 룰/AI 한쪽 누락 {data.unknown_n}건 제외)
              </span>
            ) : null}
          </p>
          <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Cell label="둘 다 강세" cell={data.divergence.both} minN={data.min_n} />
            <Cell label="룰만 강세 (AI 관망)" cell={data.divergence.rule_only} minN={data.min_n} />
            <Cell label="AI만 강세 (룰 중립)" cell={data.divergence.ai_only} minN={data.min_n} />
            <Cell label="둘 다 약세" cell={data.divergence.neither} minN={data.min_n} />
          </div>

          {data.recent.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="pb-2 font-medium">종목</th>
                  <th className="pb-2 font-medium">종합판정</th>
                  <th className="pb-2 font-medium">AI%</th>
                  <th className="pb-2 font-medium">익일</th>
                  <th className="pb-2 font-medium">D+5</th>
                  <th className="pb-2 font-medium">D+10</th>
                  <th className="pb-2 font-medium">최고/최저</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map((r, i) => {
                  const color = (v: number | null | undefined) =>
                    v == null ? "text-muted-foreground" : v > 0 ? "text-up" : "text-down";
                  return (
                    <tr key={`${r.date}-${r.name}-${i}`} className="border-t border-white/5">
                      <td className="py-1.5 font-medium">
                        {r.name}
                        <span className="ml-1 text-[10px] text-muted-foreground tabular-nums">
                          {r.date.slice(4, 6)}/{r.date.slice(6, 8)}
                        </span>
                      </td>
                      <td className="py-1.5 tabular-nums">{r.verdict_score ?? "—"}</td>
                      <td className="py-1.5 tabular-nums">{r.ai_prob != null ? `${r.ai_prob}%` : "—"}</td>
                      <td className={`py-1.5 font-semibold tabular-nums ${r.hit ? "text-up" : "text-down"}`}>
                        {r.hit ? "적중" : "미적중"} {r.return_pct > 0 ? "+" : ""}
                        {r.return_pct}%
                      </td>
                      <td className={`py-1.5 tabular-nums ${color(r.d5)}`}>{pct(r.d5)}</td>
                      <td className={`py-1.5 tabular-nums ${color(r.d10)}`}>{pct(r.d10)}</td>
                      <td className="py-1.5 text-[11px] tabular-nums text-muted-foreground">
                        {r.mfe != null ? `${r.mfe > 0 ? "+" : ""}${r.mfe}` : "—"}
                        {" / "}
                        {r.mae != null ? `${r.mae}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground">
            셀당 {data.min_n}건 이상 누적 시 적중률 표시 · <span className="text-foreground">익일(D+1)은 하루 등락이라 노이즈가 크다</span> —
            D+5·D+10 수익률과 보유기간 최고(MFE)/최저(MAE)를 함께 봐야 그 판단이 실제로 먹혔는지 드러납니다
            (예: 익일 미적중이어도 며칠 뒤 크게 오른 경우 다수). 경로 값은 거래일이 지나며 채워집니다(진행중=미성숙).
          </p>
        </>
      )}
    </section>
  );
}
