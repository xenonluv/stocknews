import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FlowSection } from "@/types/stock";
import { cn } from "@/lib/utils";

/** 주수 → "384만주" 식 축약 표기 (부호 포함). */
function shares(n: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  const abs = Math.abs(n);
  if (abs >= 100_000_000) return `${sign}${(abs / 100_000_000).toFixed(1)}억주`;
  if (abs >= 10_000) return `${sign}${Math.round(abs / 10_000).toLocaleString("ko-KR")}만주`;
  return `${sign}${abs.toLocaleString("ko-KR")}주`;
}

const fmtD = (d: string) => `${d.slice(4, 6)}/${d.slice(6, 8)}`;

function Cell({ v }: { v: number }) {
  return (
    <td
      className={cn(
        "px-2 py-1 text-right tabular-nums",
        v > 0 ? "text-up" : v < 0 ? "text-down" : "text-muted-foreground"
      )}
    >
      {shares(v)}
    </td>
  );
}

/** 투자자 수급 — 외인/기관/개인 일별 순매수 (순매수=빨강, 순매도=파랑). */
export function FlowCard({ flow }: { flow: FlowSection }) {
  const s = flow.summary;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">투자자 수급</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
          <span>
            외인 5일 순매수{" "}
            <b className={s.foreignNet5 > 0 ? "text-up" : "text-down"}>{shares(s.foreignNet5)}</b>
            <span className="text-muted-foreground"> · 순매수 {s.foreignNetDays5}/5일</span>
          </span>
          <span>
            기관 5일 순매수{" "}
            <b className={s.organNet5 > 0 ? "text-up" : "text-down"}>{shares(s.organNet5)}</b>
            <span className="text-muted-foreground"> · 순매수 {s.organNetDays5}/5일</span>
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-muted-foreground">
                <th className="px-2 py-1 text-left font-normal">일자</th>
                <th className="px-2 py-1 text-right font-normal">외국인</th>
                <th className="px-2 py-1 text-right font-normal">기관</th>
                <th className="px-2 py-1 text-right font-normal">개인</th>
                <th className="px-2 py-1 text-right font-normal">외인 보유율</th>
              </tr>
            </thead>
            <tbody>
              {flow.daily.map((d) => (
                <tr key={d.date} className="border-t border-white/5">
                  <td className="px-2 py-1 tabular-nums text-muted-foreground">{fmtD(d.date)}</td>
                  <Cell v={d.foreign} />
                  <Cell v={d.organ} />
                  <Cell v={d.individual} />
                  <td className="px-2 py-1 text-right tabular-nums text-muted-foreground">
                    {d.foreignHoldRatio !== null ? `${d.foreignHoldRatio}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
