import alphaData from "@/data/alpha.json";
import type { AlphaData } from "@/types/alpha";

/**
 * 알파 사이드카 저장소(단일 출처). agent_alpha/publish_alpha.py가 갱신하는 정적 JSON을 빌드 시 import.
 * 코어 무관 — 이 파일 + app/alpha + components/alpha + types/alpha + data/alpha.json 삭제 시 흔적 없음.
 * 빈 movers·calibration null도 유효(아직 적재/관찰 중).
 */
const ALPHA = alphaData as unknown as AlphaData;

export function getAlpha(): AlphaData {
  return ALPHA;
}
