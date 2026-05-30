"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { SignalCard, toSignalCardProps } from "@/components/signal/SignalCard";
import { signalClientService } from "@/services/signal.client";
import { isMarketOpenKST } from "@/lib/market";
import type { SignalPost } from "@/types/signal";

/** 자동 갱신 주기(ms). 장중 데이터는 15분마다 바뀌므로 60초면 충분. */
const POLL_MS = 60_000;
const LIMIT = 50;

/** 자동 갱신 상태 바 — 장중/장외를 정직하게 구분 표시 + 데이터 기준 시각. */
function LiveStatusBar({
  dataAsOf,
  justUpdated,
}: {
  dataAsOf?: string;
  justUpdated: boolean;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const tick = () => setOpen(isMarketOpenKST());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm">
      <span className="flex items-center gap-2 font-medium">
        <span className="relative flex size-2.5">
          {open && (
            <span
              className={`absolute inline-flex size-full rounded-full bg-up/70 ${justUpdated ? "animate-ping" : "animate-[ping_2.5s_ease-in-out_infinite]"}`}
              aria-hidden
            />
          )}
          <span
            className={`relative inline-flex size-2.5 rounded-full ${open ? "bg-up" : "bg-muted-foreground/50"}`}
            aria-hidden
          />
        </span>
        {open ? (
          <span className="text-up">실시간 갱신 중 · 15분마다 자동 업데이트</span>
        ) : (
          <span className="text-muted-foreground">장 마감 · 다음 거래일 자동 갱신</span>
        )}
      </span>
      {dataAsOf && (
        <span className="text-xs text-muted-foreground tabular-nums">
          데이터 기준: {dataAsOf}
        </span>
      )}
      <span className="text-xs text-warning">투자 참고용 · 매매 타점 변동 유의</span>
    </div>
  );
}

function Section({
  title,
  desc,
  items,
}: {
  title: string;
  desc: string;
  items: SignalPost[];
}) {
  if (items.length === 0) return null;
  return (
    <section className="mb-10">
      <div className="mb-4">
        <h2 className="text-xl font-bold tracking-tight">
          {title}{" "}
          <span className="text-sm font-normal text-muted-foreground tabular-nums">
            {items.length}
          </span>
        </h2>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((s) => (
          <Link
            key={s.post_id}
            href={`/signals/${s.post_id}`}
            className="block rounded-lg transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <SignalCard {...toSignalCardProps(s)} />
          </Link>
        ))}
      </div>
    </section>
  );
}

/**
 * 시그널 목록 — 서버에서 받은 초기 데이터로 즉시 렌더(정적/SEO),
 * 이후 클라이언트가 60초마다 조용히 재요청해 변경분만 상태 교체한다.
 * 전체 리로드가 없어 화면 깜빡임이 없다. (폴링 대상 API는 엣지 캐시됨)
 */
export function LiveSignals({
  initialSignals,
}: {
  initialSignals: SignalPost[];
}) {
  const [signals, setSignals] = useState<SignalPost[]>(initialSignals);
  const [justUpdated, setJustUpdated] = useState(false);
  const lastJson = useRef<string>(JSON.stringify(initialSignals));

  useEffect(() => {
    let alive = true;

    async function refresh() {
      try {
        const next = await signalClientService.getList(LIMIT);
        if (!alive) return;
        const nextJson = JSON.stringify(next);
        if (nextJson !== lastJson.current) {
          lastJson.current = nextJson;
          setSignals(next); // 실제 변경 시에만 갱신 → 불필요한 리렌더 방지
          setJustUpdated(true); // 방금 갱신됨 → 점 강조 펄스
          setTimeout(() => alive && setJustUpdated(false), 4000);
        }
      } catch {
        // 폴링 실패는 조용히 무시(다음 주기 재시도)
      }
    }

    const id = setInterval(refresh, POLL_MS);
    // 다른 탭/앱에서 돌아오면 즉시 한 번 갱신
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (signals.length === 0) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        아직 게시된 시그널이 없습니다.
      </div>
    );
  }

  return (
    <>
      <LiveStatusBar dataAsOf={signals[0]?.published_at} justUpdated={justUpdated} />
      <Section
        title="📌 시그널"
        desc="거래량·상승 이력 + 재료 포착"
        items={signals.filter((s) => s.tier !== "candidate")}
      />
      <Section
        title="👀 후보 종목군"
        desc="재료 + 거래대금 포착"
        items={signals.filter((s) => s.tier === "candidate")}
      />
    </>
  );
}
