"use client";

import { cn } from "@/lib/utils";

interface SuspicionGaugeProps {
  /** 0~100 */
  value: number;
  size?: number;
  label?: string;
  className?: string;
}

/**
 * 수상함 점수 링 게이지 — 순수 SVG + CSS 트랜지션 (의존성 없음, SSR 안전).
 * 한국 관례상 강세/주목=빨강(--up).
 */
export function SuspicionGauge({
  value,
  size = 108,
  label = "수상함",
  className,
}: SuspicionGaugeProps) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      role="img"
      aria-label={`${label} 점수 ${pct}점`}
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
        <span className="text-2xl font-bold tabular-nums text-up">{pct}</span>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
    </div>
  );
}
