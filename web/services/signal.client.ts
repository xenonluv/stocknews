"use client";

import type { ApiListResponse } from "@/types/api";
import type { SignalPost } from "@/types/signal";

/**
 * 브라우저 전용 시그널 조회 서비스.
 * 상대경로(`/api/signals`)로 호출하므로 `next/headers`(서버 전용) 의존이 없다.
 * 컴포넌트는 직접 fetch하지 않고 이 서비스를 통해 API에 접근한다.
 */
export const signalClientService = {
  async getList(limit = 50): Promise<SignalPost[]> {
    const res = await fetch(`/api/signals?limit=${limit}`);
    if (!res.ok) {
      throw new Error(`시그널 목록 조회 실패 (HTTP ${res.status})`);
    }
    const json = (await res.json()) as ApiListResponse<SignalPost>;
    return json.data;
  },
};
