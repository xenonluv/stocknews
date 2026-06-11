import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FinancialSection, ResearchItem } from "@/types/stock";
import { cn } from "@/lib/utils";

const fmtEok = (n: number | null) => (n === null ? "—" : n.toLocaleString("ko-KR"));
const RATIO_ROWS = new Set(["영업이익률", "ROE", "부채비율"]);

/** 재무 분석 — 연간 실적 추이 (확정 + 컨센서스 추정) + 증권사 리포트. */
export function FinancialsCard({
  financials: f,
  researches,
}: {
  financials: FinancialSection;
  researches: ResearchItem[];
}) {
  const h = f.highlights;
  const chips: { label: string; good: boolean | null }[] = [
    h.revenueYoY !== null
      ? { label: `매출 YoY ${h.revenueYoY > 0 ? "+" : ""}${h.revenueYoY}%`, good: h.revenueYoY > 0 }
      : null,
    h.opYoY !== null
      ? { label: `영업이익 YoY ${h.opYoY > 0 ? "+" : ""}${h.opYoY}%`, good: h.opYoY > 0 }
      : null,
    h.opMargin !== null ? { label: `영업이익률 ${h.opMargin}%`, good: h.opMargin > 0 } : null,
    h.profitable !== null
      ? { label: h.profitable ? "흑자" : "적자", good: h.profitable }
      : null,
  ].filter(Boolean) as { label: string; good: boolean | null }[];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">재무 분석</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <Badge key={c.label} variant={c.good ? "up" : "down"}>
                {c.label}
              </Badge>
            ))}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-muted-foreground">
                <th className="px-2 py-1 text-left font-normal">단위: 억원</th>
                {f.periods.map((p) => (
                  <th key={p.label} className="px-2 py-1 text-right font-normal">
                    {p.label}
                    {p.isEstimate && (
                      <span className="ml-0.5 text-[9px] text-warning" title="컨센서스 추정">
                        E
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {f.rows.map((r) => (
                <tr key={r.label} className="border-t border-white/5">
                  <td className="px-2 py-1 text-muted-foreground">{r.label}</td>
                  {r.values.map((v, i) => (
                    <td
                      key={i}
                      className={cn(
                        "px-2 py-1 text-right tabular-nums",
                        v !== null && v < 0 && "text-down"
                      )}
                    >
                      {RATIO_ROWS.has(r.label) && v !== null ? `${v}%` : fmtEok(v)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {researches.length > 0 && (
          <div className="space-y-1 border-t border-white/5 pt-2">
            <p className="text-[10px] font-semibold text-muted-foreground">최근 증권사 리포트</p>
            {researches.map((r) => (
              <p key={`${r.firm}-${r.title}`} className="truncate text-[11px]">
                <span className="text-muted-foreground">
                  {r.date && `${r.date.slice(4, 6)}/${r.date.slice(6, 8)} `}
                  {r.firm} ·
                </span>{" "}
                {r.title}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
