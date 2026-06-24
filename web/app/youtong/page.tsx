import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { getYoutong, getYoutongThresholds } from "@/lib/radar/repository";
import { YoutongList } from "@/components/youtong/YoutongList";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "곧 폭발할 후보 · 유통 회전 진행중",
  description:
    "당일 현재 등락률 +10% 이상 AND 거래량이 유통주식수의 70~100% 회전 중인 종목(폭발 직전). 표시·참고용.",
};

export default function YoutongPage() {
  const youtong = getYoutong();
  const th = getYoutongThresholds();
  return (
    <main className="container py-12">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        실시간 레이더로
      </Link>
      <header className="mb-6 space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">곧 폭발할 후보 ⚡</h1>
        <p className="text-sm text-muted-foreground">
          당일 <span className="text-up">현재 등락률 +{th.changePct}% 이상</span> 그리고{" "}
          <span className="text-warning">
            거래량이 유통주식수의 {th.turnoverMin}~{th.turnoverMax}% 회전 중
          </span>
          인 종목 · 아직 폭발 전(진행중) ·
          <span className="text-warning"> 표시·참고용, 매수 추천 아님</span>
        </p>
      </header>
      <YoutongList initial={youtong} thresholds={th} />
    </main>
  );
}
