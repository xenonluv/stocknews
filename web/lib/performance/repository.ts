import performanceData from "@/data/performance.json";
import type { PerformanceData } from "@/types/performance";

/**
 * 성과 검증 저장소 (단일 출처).
 * scripts/radar_backtest.py가 매일 장후 갱신하는 정적 JSON을 빌드 시 import.
 */
export function getPerformance(): PerformanceData {
  return performanceData as unknown as PerformanceData;
}
