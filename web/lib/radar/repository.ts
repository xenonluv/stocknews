import radarData from "@/data/radar.json";
import type { NewsItem, RadarData } from "@/types/radar";

/**
 * 레이더 저장소 (단일 출처).
 * scripts/publish.py가 cron으로 갱신하는 정적 JSON을 빌드 시 import.
 * 빈 레이더(suspects=0)도 유효한 상태다 — "오늘은 레이더 깨끗".
 */
const RADAR = radarData as unknown as RadarData;

export function getRadar(): RadarData {
  return RADAR;
}

/** 종목코드 → 관련 뉴스. /forecast 종가베팅 카드에서 재사용한다. */
export function newsByStockCode(): Record<string, NewsItem[]> {
  const map: Record<string, NewsItem[]> = {};
  for (const s of RADAR.suspects) {
    if (s.code && s.news.length > 0 && !map[s.code]) {
      map[s.code] = s.news;
    }
  }
  return map;
}
