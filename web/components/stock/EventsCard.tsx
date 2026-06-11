import { CalendarClock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EventSection } from "@/types/stock";

/** 이벤트 민감도 — D-10 매크로 캘린더와 종목 뉴스 테마의 매칭 결과. */
export function EventsCard({ events }: { events: EventSection }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarClock className="size-4" aria-hidden /> 이벤트 민감도
          <span className="text-xs font-normal text-muted-foreground">
            매칭 점수 {events.totalScore}/15
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.matched.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            D-10 이내 이벤트 {events.upcomingCount}건 중 이 종목과 테마가 겹치는 이벤트는
            없습니다.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {events.matched.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant={m.dday <= 3 ? "warning" : "neutral"}>
                  {m.dday === 0 ? "D-DAY" : `D-${m.dday}`}
                </Badge>
                <span>{m.title}</span>
                <span className="text-xs text-muted-foreground">
                  {m.categories.join("·")} · 중요도 {m.importance} · 기여 +{m.score}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
