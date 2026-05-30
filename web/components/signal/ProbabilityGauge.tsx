"use client";

import { cn } from "@/lib/utils";

interface ProbabilityGaugeProps {
  /** "88%" 또는 88 */
  value: string | number;
  size?: number;
  className?: string;
}

/**
 * 상승확률 링 게이지 — 한국 관례상 상승=빨강(--up).
 * 순수 SVG + CSS 트랜지션(의존성 없음, SSR 안전).
 */
export function ProbabilityGauge({
  value,
  size = 120,
  className,
}: ProbabilityGaugeProps) {
  const pct = clampPct(value);
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      role="img"
      aria-label={`상승 확률 ${pct}%`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--up))"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold tabular-nums text-up">{pct}%</span>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          상승확률
        </span>
      </div>
    </div>
  );
}

function clampPct(value: string | number): number {
  const n =
    typeof value === "number"
      ? value
      : parseInt(value.replace(/[^0-9]/g, ""), 10);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
}
