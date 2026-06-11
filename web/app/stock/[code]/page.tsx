import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { SearchBox } from "@/components/stock/SearchBox";
import { StockReportView } from "@/components/stock/StockReportView";

// 온디맨드 동적 페이지 — 데이터는 클라이언트가 /api/stock/[code]에서 가져온다.
// (정적 생성 대상이 아님: 종목코드는 임의 입력)

interface Props {
  params: { code: string };
}

export function generateMetadata({ params }: Props): Metadata {
  // loading.tsx 스트리밍이 시작되기 전에 검증해야 상태코드가 진짜 404가 된다.
  if (!/^\d{6}$/.test(params.code)) notFound();
  return {
    title: `${params.code} 종목 분석 리포트`,
    description:
      "재무·수급·기술지표·재료뉴스·이벤트 민감도를 룰베이스로 종합한 종목 분석 리포트.",
  };
}

export default function StockPage({ params }: Props) {
  if (!/^\d{6}$/.test(params.code)) notFound();

  return (
    <main className="container max-w-4xl py-10">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden /> 레이더로
        </Link>
        <SearchBox className="w-full sm:w-80" />
      </div>
      <StockReportView code={params.code} />
    </main>
  );
}
