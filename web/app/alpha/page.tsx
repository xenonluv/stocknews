import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { getAlpha } from "@/lib/alpha/repository";
import { AlphaList } from "@/components/alpha/AlphaList";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "알파 — 전진검증 + 재료·찌라시 추론",
  description:
    "움직이는 종목의 유통회전율·14:30 스파크·종가강도·수급·거래원 + LLM 재료/조작 판단을 매일 적재해 익일 결과로 검증(전진검증). 측정·실험용.",
};

export default function AlphaPage() {
  const alpha = getAlpha();
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
        <h1 className="text-3xl font-bold tracking-tight">알파 🧠</h1>
        <p className="text-sm text-muted-foreground">
          움직이는 종목의 <span className="text-up">유통회전율·14:30 스파크·종가강도·수급·거래원</span> + LLM{" "}
          <span className="text-warning">재료 진위·조작위험·찌라시 작전</span> 판단을 매일 적재 →{" "}
          익일 결과로 <span className="text-up">전진검증</span>. 신호가 통하는지 <b>측정</b>하는 실험 ·{" "}
          <span className="text-warning">매수 추천 아님</span>
        </p>
      </header>
      <AlphaList initial={alpha} />
    </main>
  );
}
