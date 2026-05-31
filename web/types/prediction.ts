// analyzer가 생성하는 '내일 상승 예측' 데이터 (web/data/predictions.json)

export interface ForecastItem {
  ticker: string;
  code: string;
  tomorrow_up_prob: string; // "68%"
  entry: number | null; // 진입가(오늘 종가)
  target: number | null;
  stop: number | null; // 손절가
  confidence: string; // 상 | 중 | 하
  reasons: string[];
  risk: string;
  day_change?: number | null;
}

export interface BacktestSummary {
  recent_hit_rate?: string; // "최근 N일 적중률"
  yesterday?: string; // 어제 예측 적중 여부
  sample?: number;
}

export interface Predictions {
  as_of: string;
  intraday_rank: ForecastItem[]; // 장중 잠정 랭킹
  closing_bet: ForecastItem[]; // 14:20 종가베팅 후보
  disclaimer: string;
  backtest: BacktestSummary | null;
}
