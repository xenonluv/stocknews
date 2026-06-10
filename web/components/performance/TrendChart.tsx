import type { PerfPoint } from "@/types/performance";

const W = 720;
const H = 220;
const PAD = { top: 14, right: 14, bottom: 26, left: 36 };

function fmtDate(d: string) {
  return `${d.slice(4, 6)}/${d.slice(6, 8)}`;
}

/**
 * 누적 적중률 추세 차트 — 순수 SVG(의존성 없음, SSR 렌더).
 * 라인 = 누적 적중률(우상향 목표), 하단 막대 = 일별 표본 수, 50% 점선 = 동전던지기 기준.
 */
export function TrendChart({ series }: { series: PerfPoint[] }) {
  const pts = series.filter((p) => p.cum_hit_rate !== null);
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const x = (i: number) =>
    PAD.left + (series.length <= 1 ? iw / 2 : (i / (series.length - 1)) * iw);
  const y = (rate: number) => PAD.top + (1 - rate / 100) * ih;
  const maxN = Math.max(1, ...series.map((p) => p.n));

  const line = series
    .map((p, i) =>
      p.cum_hit_rate === null ? null : `${x(i).toFixed(1)},${y(p.cum_hit_rate).toFixed(1)}`
    )
    .filter(Boolean)
    .join(" ");

  return (
    <div className="overflow-x-auto rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="min-w-[480px] w-full"
        role="img"
        aria-label="누적 적중률 추세"
      >
        {/* Y축 눈금 */}
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(v)}
              y2={y(v)}
              stroke="rgba(255,255,255,0.08)"
              strokeDasharray={v === 50 ? "4 4" : undefined}
            />
            <text
              x={PAD.left - 6}
              y={y(v) + 3}
              textAnchor="end"
              fontSize="10"
              fill="hsl(214 14% 65%)"
            >
              {v}%
            </text>
          </g>
        ))}
        {/* 50% 기준 라벨 */}
        <text x={W - PAD.right} y={y(50) - 4} textAnchor="end" fontSize="9" fill="hsl(214 14% 50%)">
          50% (무작위 기준)
        </text>

        {/* 일별 표본 수 막대 */}
        {series.map((p, i) =>
          p.n > 0 ? (
            <rect
              key={`bar-${p.date}`}
              x={x(i) - 3}
              y={H - PAD.bottom - (p.n / maxN) * 24}
              width={6}
              height={(p.n / maxN) * 24}
              fill="rgba(255,255,255,0.18)"
            >
              <title>{`${fmtDate(p.date)} 표본 ${p.n}건`}</title>
            </rect>
          ) : null
        )}

        {/* 누적 적중률 라인 */}
        {pts.length >= 2 && (
          <polyline points={line} fill="none" stroke="hsl(355 88% 58%)" strokeWidth="2.5" />
        )}
        {series.map((p, i) =>
          p.cum_hit_rate === null ? null : (
            <circle key={p.date} cx={x(i)} cy={y(p.cum_hit_rate)} r="3.5" fill="hsl(355 88% 58%)">
              <title>{`${fmtDate(p.date)} 누적 ${p.cum_hit_rate}% (n=${p.cum_n})${
                p.n > 0 ? ` · 당일 ${p.hits}/${p.n}` : ""
              }`}</title>
            </circle>
          )
        )}

        {/* X축 날짜 (양끝 + 중앙) */}
        {series.length > 0 &&
          [0, Math.floor((series.length - 1) / 2), series.length - 1]
            .filter((v, i, a) => a.indexOf(v) === i)
            .map((i) => (
              <text
                key={`xd-${i}`}
                x={x(i)}
                y={H - 8}
                textAnchor="middle"
                fontSize="10"
                fill="hsl(214 14% 65%)"
              >
                {fmtDate(series[i].date)}
              </text>
            ))}
      </svg>
    </div>
  );
}
