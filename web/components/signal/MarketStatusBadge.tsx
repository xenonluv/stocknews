import { TrendingDown, TrendingUp, Flame, HelpCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { MarketStatus } from "@/types/signal";

/**
 * 시장 위치 뱃지 — 색 + 아이콘 병행(색맹 접근성).
 * 안전 진입(눌림목/저점)=그린, 과다상승=경고 앰버, 분석불가=중립 그레이.
 */
const STATUS_MAP: Record<
  MarketStatus,
  { variant: "safe" | "warning" | "neutral"; icon: typeof TrendingUp; label: string }
> = {
  눌림목: { variant: "safe", icon: TrendingDown, label: "눌림목" },
  저점: { variant: "safe", icon: TrendingUp, label: "저점" },
  과다상승: { variant: "warning", icon: Flame, label: "과다상승" },
  분석불가: { variant: "neutral", icon: HelpCircle, label: "분석불가" },
};

export function MarketStatusBadge({ status }: { status: MarketStatus }) {
  const { variant, icon: Icon, label } = STATUS_MAP[status];
  return (
    <Badge variant={variant} aria-label={`시장 위치: ${label}`}>
      <Icon className="size-3" aria-hidden />
      {label}
    </Badge>
  );
}
