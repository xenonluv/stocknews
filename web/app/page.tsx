import Link from "next/link";

import { signalService } from "@/services/signal.service";
import { SignalCard, toSignalCardProps } from "@/components/signal/SignalCard";
import { Pagination } from "@/components/signal/Pagination";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 9;

function parseIntParam(raw: string | string[] | undefined, fallback: number): number {
  const v = Array.isArray(raw) ? raw[0] : raw;
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isNaN(n) || n < 1 ? fallback : n;
}

export default async function Home({
  searchParams,
}: {
  searchParams: { page?: string; limit?: string };
}) {
  const page = parseIntParam(searchParams.page, 1);
  const limit = parseIntParam(searchParams.limit, DEFAULT_LIMIT);

  const { data: signals, pagination } = await signalService.getList({
    page,
    limit,
  });

  return (
    <main className="container py-12">
      <header className="mb-8 space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">시그널 분석</h1>
        <p className="text-sm text-muted-foreground">
          스크리너(거래량·상승 이력 + 재료 + 3분봉 골든크로스) + AI 분석 결과 ·
          <span className="text-warning"> 투자 참고용, 매수 추천 아님</span>
          <span className="tabular-nums"> · 총 {pagination.total}건</span>
        </p>
      </header>

      {signals.length === 0 ? (
        <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
          아직 게시된 시그널이 없습니다.
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {signals.map((s) => (
              <Link
                key={s.post_id}
                href={`/signals/${s.post_id}`}
                className="block rounded-lg transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <SignalCard {...toSignalCardProps(s)} />
              </Link>
            ))}
          </div>
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            limit={limit}
          />
        </>
      )}
    </main>
  );
}
