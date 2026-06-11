import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TechnicalSection } from "@/types/stock";

const won = (n: number | null) => (n === null ? "—" : `${n.toLocaleString("ko-KR")}원`);

/** 기술적 분석 — 지표별 신호 뱃지 + 수치 (analyzer 지표 동일 산식). */
export function TechnicalCard({ technical: t }: { technical: TechnicalSection }) {
  const signals: { label: string; on: boolean | null; warn?: boolean; detail?: string }[] = [
    { label: "정배열 (5>20>60)", on: t.maAligned },
    {
      label: "MACD",
      on: t.macd ? t.macd.goldenCross || (t.macd.aboveZero && t.macd.bullish) : null,
      detail: t.macd ? `히스토그램 ${t.macd.hist}` : undefined,
    },
    {
      label: t.rsi ? `RSI ${t.rsi.value}` : "RSI",
      on: t.rsi ? t.rsi.zone === "강세" : null,
      warn: t.rsi?.zone === "과매수",
      detail: t.rsi?.zone,
    },
    {
      label: t.stochastic ? `스토캐스틱 ${t.stochastic.k}` : "스토캐스틱",
      on: t.stochastic ? t.stochastic.goldenCross && !t.stochastic.overbought : null,
      warn: t.stochastic?.overbought,
      detail: t.stochastic
        ? t.stochastic.overbought
          ? "과매수"
          : t.stochastic.goldenCross
            ? "골든크로스"
            : t.stochastic.bullish
              ? "강세"
              : "약세"
        : undefined,
    },
    {
      label: "일목균형표",
      on: t.ichimoku.available ? !!(t.ichimoku.aboveCloud && t.ichimoku.tenkanGtKijun) : null,
      detail: !t.ichimoku.available
        ? undefined
        : t.ichimoku.aboveCloud
          ? "구름 위"
          : t.ichimoku.inCloud
            ? "구름 안"
            : "구름 아래",
    },
    {
      label: `마감강도 ${t.closeStrength ?? "—"}`,
      on: t.closeStrength !== null ? t.closeStrength >= 0.7 : null,
      detail: t.closeStrength !== null && t.closeStrength < 0.4 ? "약한 마감" : undefined,
    },
    {
      label: `거래량 ${t.volumeVs20d ?? "—"}배`,
      on: t.volumeVs20d !== null ? t.volumeVs20d >= 1.5 : null,
      detail: "20일 평균 대비",
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">기술적 분석</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {signals.map((s) => (
            <Badge
              key={s.label}
              variant={s.warn ? "warning" : s.on ? "up" : "neutral"}
              title={s.detail}
            >
              {s.label}
              {s.detail ? ` · ${s.detail}` : ""}
            </Badge>
          ))}
        </div>
        <dl className="grid grid-cols-3 gap-2 text-xs">
          {[
            { label: "5일선", v: t.ma5 },
            { label: "20일선", v: t.ma20 },
            { label: "60일선", v: t.ma60 },
          ].map((m) => (
            <div key={m.label} className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1.5">
              <dt className="text-muted-foreground">{m.label}</dt>
              <dd className="font-medium tabular-nums">{won(m.v)}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
