import { getBaseUrl } from "@/lib/api/base-url";
import type { ApiListResponse } from "@/types/api";
import type { SignalPost } from "@/types/signal";

/**
 * 시그널 도메인 서비스 — 컴포넌트는 fetch를 직접 호출하지 않고 이 서비스를 통해 API에 접근.
 * (hooks/components → service → /api/signals)
 */
export const signalService = {
  async getList(params?: {
    stock?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiListResponse<SignalPost>> {
    const qs = new URLSearchParams();
    if (params?.stock) qs.set("stock", params.stock);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));

    const url = `${getBaseUrl()}/api/signals${qs.size ? `?${qs}` : ""}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`시그널 목록 조회 실패 (HTTP ${res.status})`);
    }
    return res.json();
  },

  async getById(postId: string): Promise<SignalPost | null> {
    const url = `${getBaseUrl()}/api/signals/${encodeURIComponent(postId)}`;
    const res = await fetch(url, { cache: "no-store" });
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`시그널 조회 실패 (HTTP ${res.status})`);
    }
    const json = (await res.json()) as { data: SignalPost };
    return json.data;
  },
};
