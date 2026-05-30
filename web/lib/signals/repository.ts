import signalsData from "@/data/signals.json";
import type { SignalPost } from "@/types/signal";

/**
 * 시그널 저장소 (단일 출처).
 * 현재는 정적 JSON. 운영에서는 DB/팀원6 발행 스토어로 교체.
 * CEO 승인(PUBLISHED) 건만, 게시 시각 내림차순으로 노출한다.
 */
const PUBLISHED: SignalPost[] = (signalsData as SignalPost[])
  .filter((s) => s.status === "PUBLISHED")
  .sort((a, b) => b.published_at.localeCompare(a.published_at));

export interface ListParams {
  stock?: string;
  page?: number;
  limit?: number;
}

export function listSignals({ stock, page = 1, limit = 20 }: ListParams) {
  let items = PUBLISHED;
  if (stock) {
    items = items.filter((s) => s.target_stock.includes(stock));
  }
  const total = items.length;
  const start = (page - 1) * limit;
  return { items: items.slice(start, start + limit), total };
}

export function getSignal(postId: string): SignalPost | null {
  return PUBLISHED.find((s) => s.post_id === postId) ?? null;
}

/** 현재 배포의 모든 post_id (상세페이지 정적 사전생성용). */
export function allSignalIds(): string[] {
  return PUBLISHED.map((s) => s.post_id);
}
