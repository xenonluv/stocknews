import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { getPredictions } from "@/lib/predictions/repository";
import { ForecastList } from "@/components/forecast/ForecastList";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "내일 상승 예측 · 종가베팅",
  description: "기술적 분석 + 재료 + 장중 지속성으로 내일 오를 확률 높은 종목 예측. 투자 참고용.",
};

export default function ForecastPage() {
  const data = getPredictions();
  return (
    <main className="container py-12">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        실시간 시그널로
      </Link>
      <header className="mb-6 space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">내일 상승 예측 🎯</h1>
        <p className="text-sm text-muted-foreground">
          오늘 종가 베팅 시 <span className="text-up">내일 오를 확률</span>이 높은 종목을 예측합니다.
          기술(차트)·재료·장중 지속성 종합 ·
          <span className="text-warning"> 확률은 합치 점수 기반 추정(백테스트로 검증 중)</span>
        </p>
      </header>
      <ForecastList initial={data} />
    </main>
  );
}
