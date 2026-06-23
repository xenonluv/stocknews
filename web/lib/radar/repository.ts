import radarData from "@/data/radar.json";
import type { Explosion, RadarData } from "@/types/radar";

/**
 * 레이더 저장소 (단일 출처).
 * scripts/publish.py가 cron으로 갱신하는 정적 JSON을 빌드 시 import.
 * 빈 레이더(suspects=0)도 유효한 상태다 — "오늘은 레이더 깨끗".
 */
const RADAR = radarData as unknown as RadarData;

export function getRadar(): RadarData {
  return RADAR;
}

/** 당일 폭발 종목 (/forecast 페이지). 회전율 내림차순 정렬은 publish 단계에서 완료. */
export function getExplosions(): Explosion[] {
  return RADAR.explosions ?? [];
}
