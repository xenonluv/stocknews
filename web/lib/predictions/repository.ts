import data from "@/data/predictions.json";
import type { Predictions } from "@/types/prediction";

/** 예측 데이터 단일 출처(빌드 시 import). analyzer/run.py가 갱신 → 배포마다 신선. */
export function getPredictions(): Predictions {
  return data as Predictions;
}
