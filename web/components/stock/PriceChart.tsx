import type { Candle } from "@/types/stock";

const W = 720;
const H = 300;
const VOL_H = 48;
const PAD = { top: 10, right: 52, bottom: 18, left: 8 };

const UP = "#F23645"; // 상승 = 빨강 (한국 관례)
const DOWN = "#2962FF"; // 하락 = 파랑

function maLine(closes: number[], n: number): (number | null)[] {
  return closes.map((_, i) => {
    if (i + 1 < n) return null;
    let s = 0;
    for (let j = i - n + 1; j <= i; j++) s += closes[j];
    return s / n;
  });
}

/**
 * 일봉 캔들 차트 — 순수 SVG (의존성 없음, SSR 안전).
 * 캔들 + MA20/MA60 라인 + 하단 거래량. TrendChart.tsx와 동일한 시각 톤.
 */
export function PriceChart({ candles }: { candles: Candle[] }) {
  const data = candles.slice(-120);
  if (data.length === 0) return null;

  const closes = data.map((c) => c.close);
  const ma20 = maLine(closes, 20);
  const ma60 = maLine(closes, 60);

  const lo = Math.min(...data.map((c) => c.low));
  const hi = Math.max(...data.map((c) => c.high));
  const span = hi - lo || 1;
  const maxVol = Math.max(1, ...data.map((c) => c.volume));

  const iw = W - PAD.left - PAD.right;
  const ph = H - PAD.top - PAD.bottom - VOL_H - 8; // 가격 영역 높이
  const step = iw / data.length;
  const bw = Math.max(1.5, Math.min(7, step * 0.6));

  const x = (i: number) => PAD.left + i * step + step / 2;
  const y = (v: number) => PAD.top + (1 - (v - lo) / span) * ph;
  const volY = (v: number) => H - PAD.bottom - (v / maxVol) * VOL_H;

  const path = (vals: (number | null)[]) =>
    vals
      .map((v, i) => (v === null ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`))
      .filter(Boolean)
      .join(" ");

  const gridLevels = [0.25, 0.5, 0.75].map((r) => lo + span * r);
  const fmtD = (d: string) => `${d.slice(4, 6)}/${d.slice(6, 8)}`;

  return (
    <div className="overflow-x-auto rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="min-w-[480px] w-full" role="img" aria-label="일봉 차트">
        {gridLevels.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.07)" />
            <text x={W - PAD.right + 4} y={y(v) + 3} fontSize="10" fill="hsl(214 14% 65%)">
              {Math.round(v).toLocaleString("ko-KR")}
            </text>
          </g>
        ))}

        {/* 거래량 */}
        {data.map((c, i) => (
          <rect
            key={`v${c.date}`}
            x={x(i) - bw / 2}
            y={volY(c.volume)}
            width={bw}
            height={H - PAD.bottom - volY(c.volume)}
            fill={c.close >= c.open ? "rgba(242,54,69,0.35)" : "rgba(41,98,255,0.35)"}
          />
        ))}

        {/* 캔들 */}
        {data.map((c, i) => {
          const color = c.close >= c.open ? UP : DOWN;
          const top = y(Math.max(c.open, c.close));
          const bot = y(Math.min(c.open, c.close));
          return (
            <g key={c.date}>
              <line x1={x(i)} x2={x(i)} y1={y(c.high)} y2={y(c.low)} stroke={color} strokeWidth={1} />
              <rect
                x={x(i) - bw / 2}
                y={top}
                width={bw}
                height={Math.max(1, bot - top)}
                fill={color}
              >
                <title>{`${fmtD(c.date)} 시 ${c.open.toLocaleString()} 고 ${c.high.toLocaleString()} 저 ${c.low.toLocaleString()} 종 ${c.close.toLocaleString()}`}</title>
              </rect>
            </g>
          );
        })}

        {/* MA 라인 */}
        <polyline points={path(ma20)} fill="none" stroke="#FFB020" strokeWidth={1.3} opacity={0.9} />
        <polyline points={path(ma60)} fill="none" stroke="#9C6ADE" strokeWidth={1.3} opacity={0.9} />

        {/* X축 날짜 (5등분) */}
        {[0, 0.25, 0.5, 0.75, 1].map((r) => {
          const i = Math.min(data.length - 1, Math.round(r * (data.length - 1)));
          return (
            <text key={r} x={x(i)} y={H - 4} textAnchor="middle" fontSize="9" fill="hsl(214 14% 55%)">
              {fmtD(data[i].date)}
            </text>
          );
        })}
      </svg>
      <p className="mt-1 flex gap-3 text-[10px] text-muted-foreground">
        <span><span className="inline-block h-[2px] w-4 align-middle" style={{ background: "#FFB020" }} /> MA20</span>
        <span><span className="inline-block h-[2px] w-4 align-middle" style={{ background: "#9C6ADE" }} /> MA60</span>
        <span>최근 {data.length}거래일</span>
      </p>
    </div>
  );
}
