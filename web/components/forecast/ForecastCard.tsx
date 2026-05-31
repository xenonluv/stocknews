import { Target, Shield, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProbabilityGauge } from "@/components/signal/ProbabilityGauge";
import type { ForecastItem } from "@/types/prediction";

const won = (n: number | null) => (n == null ? "-" : n.toLocaleString("ko-KR"));

/** 내일 상승 예측 카드 — 진입(종가)·목표·손절·근거. 확신 '상'이면 블루 글래스 강조. */
export function ForecastCard({ item, rank }: { item: ForecastItem; rank?: number }) {
  const strong = item.confidence === "상";
  const chg = item.day_change;
  return (
    <Card
      className={cn(
        "relative h-full overflow-hidden",
        strong
          ? "border border-[rgba(125,176,255,0.4)] bg-transparent bg-gradient-to-br from-[rgba(59,130,246,0.14)] to-[rgba(255,255,255,0.04)] backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_0_0_1px_rgba(59,130,246,0.5),0_0_34px_4px_rgba(59,130,246,0.4)]"
          : "border border-white/10 bg-white/[0.045] backdrop-blur-md"
      )}
    >
      <CardHeader className="gap-2 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {rank != null && (
              <span className="text-sm font-bold text-muted-foreground tabular-nums">
                #{rank}
              </span>
            )}
            <Badge variant={strong ? "up" : "neutral"}>확신 {item.confidence}</Badge>
          </div>
          {chg != null && (
            <span
              className={cn(
                "text-sm font-semibold tabular-nums",
                chg > 0 ? "text-up" : chg < 0 ? "text-down" : "text-muted-foreground"
              )}
            >
              {chg > 0 ? "+" : ""}
              {chg.toFixed(2)}%
            </span>
          )}
        </div>
        <h3 className="text-xl font-bold tracking-tight">{item.ticker}</h3>
      </CardHeader>

      <CardContent className="flex items-center gap-4">
        <div className="flex flex-col items-center">
          <ProbabilityGauge value={item.tomorrow_up_prob} size={92} />
          <span className="mt-1 text-[10px] text-muted-foreground">익일 상승</span>
        </div>
        <div className="flex-1 space-y-1.5 text-sm">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="size-3.5 text-muted-foreground" aria-hidden />
            진입(종가) <span className="font-semibold tabular-nums">{won(item.entry)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-up">
            <Target className="size-3.5" aria-hidden />
            목표 <span className="font-semibold tabular-nums">{won(item.target)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-down">
            <Shield className="size-3.5" aria-hidden />
            손절 <span className="font-semibold tabular-nums">{won(item.stop)}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex-col items-start gap-1.5 border-t border-white/10 pt-3">
        <ul className="flex flex-wrap gap-1.5">
          {item.reasons.map((r, i) => (
            <li key={i} className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-foreground/85">
              {r}
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-warning">⚠ {item.risk}</p>
      </CardFooter>
    </Card>
  );
}
