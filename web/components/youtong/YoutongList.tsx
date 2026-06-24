"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Zap, ArrowRight } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { radarClientService } from "@/services/radar.client";
import { marketPhaseKST, type MarketPhase } from "@/lib/market";
import type { Youtong } from "@/types/radar";

const POLL_MS = 60_000;

const PHASE_MSG: Record<MarketPhase, { dot: string; text: string }> = {
  pre: { dot: "bg-muted-foreground/50", text: "개장 전 · 09:00부터 감시 시작" },
  intraday: { dot: "bg-warning animate-pulse", text: "곧 폭발 후보 감시 (실시간 갱신)" },
  locked: { dot: "bg-warning animate-pulse", text: "곧 폭발 후보 감시 (실시간 갱신)" },
  closed: { dot: "bg-muted-foreground/50", text: "장 마감 · 다음 거래일 갱신" },
};

/** 등락률 표기 (한국 색 관례: 상승=빨강 up, 하락=파랑 down) */
function changeClass(v: number) {
  return v > 0 ? "text-up" : v < 0 ? "text-down" : "text-muted-foreground";
}

function YoutongCard({ e, rank }: { e: Youtong; rank: number }) {
  return (
    <Link href={`/stock/${e.code}`} className="group block">
      <Card className="h-full border border-[rgba(245,158,11,0.35)] bg-gradient-to-br from-[rgba(245,158,11,0.1)] to-[rgba(255,255,255,0.03)] backdrop-blur-xl transition-shadow hover:shadow-[0_0_18px_1px_rgba(245,158,11,0.35)]">
        <CardHeader className="gap-2 pb-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge className="border-transparent bg-warning px-2 py-0.5 text-sm font-bold text-warning-foreground">
                <Zap className="mr-1 size-3.5" aria-hidden /> #{rank}
              </Badge>
              {e.sector && <Badge variant="neutral">{e.sector}</Badge>}
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">
              거래대금 {e.value_eok.toLocaleString()}억
            </span>
          </div>
          <h2 className="flex items-baseline gap-2 text-2xl font-bold tracking-tight">
            <span>{e.name}</span>
            {/* 현재 등락률(실시간) — 한국 색 관례 */}
            <span className={`text-base font-semibold tabular-nums ${changeClass(e.change_pct)}`}>
              {e.change_pct > 0 ? "+" : ""}
              {e.change_pct.toFixed(2)}%
            </span>
            <ArrowRight className="ml-auto size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
          </h2>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <p
              className="text-[11px] text-muted-foreground"
              title="당일 거래량 / 유통주식수 — 유통주식이 손바뀐 강도. 90%+면 폭발(/forecast)로 분류"
            >
              유통주식 회전율
            </p>
            <p className="text-lg font-bold tabular-nums text-warning">
              {e.vol_turnover_pct.toLocaleString()}%
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">당일 고가 등락률</p>
            <p className="text-lg font-bold tabular-nums text-up">+{e.high_pct.toFixed(1)}%</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

type Thresholds = { changePct: number; turnoverMin: number; turnoverMax: number };

export function YoutongList({
  initial,
  thresholds,
}: {
  initial: Youtong[];
  thresholds: Thresholds;
}) {
  const [youtong, setYoutong] = useState<Youtong[]>(initial);
  const [th, setTh] = useState<Thresholds>(thresholds);
  const [phase, setPhase] = useState<MarketPhase>("closed");

  useEffect(() => {
    setPhase(marketPhaseKST());
    const ph = setInterval(() => setPhase(marketPhaseKST()), 60_000);
    let alive = true;
    async function refresh() {
      try {
        const data = await radarClientService.get();
        if (!alive) return;
        setYoutong(data.youtong ?? []);
        const p = data.params ?? {};
        if (p.youtong_change_pct != null || p.youtong_turnover_min != null || p.youtong_turnover_max != null) {
          setTh((prev) => ({
            changePct: p.youtong_change_pct ?? prev.changePct,
            turnoverMin: p.youtong_turnover_min ?? prev.turnoverMin,
            turnoverMax: p.youtong_turnover_max ?? prev.turnoverMax,
          }));
        }
      } catch {
        /* 조용히 무시 */
      }
    }
    refresh(); // 마운트 즉시 1회 — SSG 빌드 스냅샷(최대 ~10분 stale)을 첫 폴링(60초) 전에 갱신
    const id = setInterval(refresh, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
      clearInterval(ph);
    };
  }, []);

  const status = PHASE_MSG[phase];

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm">
        <span className="flex items-center gap-2 font-medium">
          <span className={`inline-flex size-2.5 rounded-full ${status.dot}`} aria-hidden />
          {status.text}
        </span>
        <span className="text-xs text-warning">표시·참고용, 매수 추천 아님</span>
      </div>

      {youtong.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] py-16 text-center">
          <p className="text-lg font-semibold">현재 조건을 충족하는 종목이 없습니다</p>
          <p className="mt-1 text-sm text-muted-foreground">
            현재 등락률 +{th.changePct}% 이상 AND 유통주식 회전율 {th.turnoverMin}~{th.turnoverMax}%인 종목만
            표시합니다 (이미 폭발한 종목은 제외 — 폭발은 폭발 페이지에서 확인).
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {youtong.map((e, i) => (
            <YoutongCard key={e.code} e={e} rank={i + 1} />
          ))}
        </div>
      )}
    </>
  );
}
