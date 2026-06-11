import { ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { NewsSection } from "@/types/stock";

const SENT_VARIANT = { 호재: "up", 악재: "down", 혼재: "warning", 중립: "neutral" } as const;

const fmtDt = (dt: string) =>
  dt.length >= 12 ? `${dt.slice(4, 6)}/${dt.slice(6, 8)} ${dt.slice(8, 10)}:${dt.slice(10, 12)}` : "";

/** 재료 뉴스 — 시황 노이즈를 거른 재료성 뉴스 + 호악재 판정 (룰베이스). */
export function NewsCard({ news }: { news: NewsSection }) {
  const s = news.summary;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          재료 뉴스
          <Badge variant={SENT_VARIANT[s.sentiment]}>{s.sentiment}</Badge>
          <span className="text-xs font-normal text-muted-foreground">
            중요도 {s.importance}/10 · 임팩트 {s.impact} · 재료성 {s.relevantCount}건
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {news.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">최근 뉴스가 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {news.items.map((n) => (
              <li key={`${n.datetime}-${n.title}`} className="flex items-start gap-2 text-sm">
                <Badge variant={SENT_VARIANT[n.sentiment]} className="mt-0.5 shrink-0">
                  {n.sentiment}
                </Badge>
                <div className="min-w-0">
                  {n.url ? (
                    <a
                      href={n.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-start gap-1 hover:underline"
                    >
                      <span className={n.relevant ? "" : "text-muted-foreground"}>{n.title}</span>
                      <ExternalLink className="mt-1 size-3 shrink-0 text-muted-foreground" aria-hidden />
                    </a>
                  ) : (
                    <span className={n.relevant ? "" : "text-muted-foreground"}>{n.title}</span>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    {fmtDt(n.datetime)}
                    {n.office && ` · ${n.office}`}
                    {!n.relevant && " · 시황성(재료 아님)"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
