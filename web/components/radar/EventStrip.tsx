"use client";

import { CalendarDays } from "lucide-react";

import { cn } from "@/lib/utils";
import type { RadarEvent } from "@/types/radar";

function ddayLabel(d: number) {
  return d === 0 ? "D-DAY" : `D-${d}`;
}

/**
 * 다가오는 이벤트 스트립 (조건 1) — D-day 칩 가로 나열.
 * 칩 클릭 시 해당 이벤트에 민감한 수상 종목만 필터링한다.
 */
export function EventStrip({
  events,
  selected,
  onSelect,
}: {
  events: RadarEvent[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  if (events.length === 0) {
    return (
      <p className="mb-6 text-sm text-muted-foreground">
        10일 이내 예정된 매크로 이벤트가 없습니다.
      </p>
    );
  }
  return (
    <section className="mb-8">
      <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
        <CalendarDays className="size-4" aria-hidden />
        10일 이내 예정 이벤트
        <span className="text-xs font-normal">— 클릭하면 민감 종목만 필터</span>
      </h2>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {events.map((ev) => {
          const isSel = selected === ev.id;
          const urgent = ev.dday <= 1;
          return (
            <button
              key={ev.id}
              type="button"
              onClick={() => onSelect(isSel ? null : ev.id)}
              aria-pressed={isSel}
              className={cn(
                "flex shrink-0 flex-col gap-1 rounded-lg border px-3.5 py-2.5 text-left transition-colors",
                isSel
                  ? "border-up/70 bg-up/15 shadow-[0_0_16px_1px_hsl(var(--up)/0.35)]"
                  : "border-white/10 bg-white/[0.04] hover:border-white/25"
              )}
            >
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[11px] font-bold tabular-nums",
                    urgent ? "bg-up text-up-foreground" : "bg-muted text-foreground/90"
                  )}
                >
                  {ddayLabel(ev.dday)}
                </span>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {ev.date.slice(5).replace("-", "/")}
                  {ev.country ? ` · ${ev.country}` : ""}
                </span>
              </span>
              <span className="text-sm font-medium text-foreground">
                {ev.title}
                {ev.estimated && (
                  <span className="ml-1 text-[10px] text-warning" title="규칙 기반 추정일">
                    (추정)
                  </span>
                )}
              </span>
              <span className="flex gap-1">
                {ev.category.map((c) => (
                  <span
                    key={c}
                    className="rounded-full bg-white/10 px-1.5 py-px text-[10px] text-muted-foreground"
                  >
                    {c}
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
