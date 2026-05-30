import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { getSignal, allSignalIds } from "@/lib/signals/repository";
import { SignalCard, toSignalCardProps } from "@/components/signal/SignalCard";
import { NewsList } from "@/components/signal/NewsList";

// 모든 시그널 상세를 빌드 시 정적 생성. 미생성 id는 정적 404(함수 0회).
// 데이터는 배포마다 갱신되므로 유효 id는 항상 현재 배포에 포함된다.
export const dynamicParams = false;

export function generateStaticParams() {
  return allSignalIds().map((post_id) => ({ post_id }));
}

export function generateMetadata({
  params,
}: {
  params: { post_id: string };
}): Metadata {
  const signal = getSignal(params.post_id);
  if (!signal) return { title: "시그널을 찾을 수 없음" };
  const title = `${signal.target_stock} ${signal.signal_probability} · ${signal.position_type}`;
  return {
    title,
    description: signal.headline,
    openGraph: {
      type: "article",
      title: `${title} — StockNews`,
      description: signal.headline,
      url: `/signals/${signal.post_id}`,
      publishedTime: signal.published_at,
    },
    twitter: { card: "summary", title, description: signal.headline },
  };
}

export default function SignalDetailPage({
  params,
}: {
  params: { post_id: string };
}) {
  const signal = getSignal(params.post_id);
  if (!signal) notFound();

  return (
    <main className="container max-w-2xl py-12">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" aria-hidden />
        목록으로
      </Link>
      {/* 상세에선 카드 내 뉴스 미리보기를 끄고(news=[]) 아래 전체 NewsList로 노출 */}
      <SignalCard {...toSignalCardProps(signal)} news={[]} />
      <NewsList news={signal.news} />
    </main>
  );
}
