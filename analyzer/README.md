# analyzer — 내일 상승 종목 예측 (별도 서브시스템)

기존 시스템(`scripts/`·`web/`)에 **영향 없이** 동작하는 분석 에이전트. 목표: **오늘 종가 베팅 시 내일 오를 확률 높은 종목 선정**(장중만). 결과는 `web/data/predictions.json` → 사이트 `/forecast`.

## 원칙
- **종목군은 기존 공개 API(`/api/signals`)에서** 받아 네이버 초과호출 방지(기존이 이미 15분마다 분석).
- 심화 지표는 **상위 ~10종목에만** 네이버 직접 호출(`scripts/net.py` 레이트리밋 재사용).
- **지표는 코드가 계산, LLM은 해석만**(환각 방지).
- 자동 루프는 **결정론 confluence**(LLM 미사용, 안정). `prompts/`는 에이전트 스펙(수동 심화분석용).

## 구성
| 파일 | 역할 |
|------|------|
| `collect.py` | 팀원1: `/api/signals` 종목군 수집 + 장중 시계열 누적(`state/`) |
| `indicators.py` | 팀원2: 일봉 → 마감강도·MA정배열·MACD·RSI·Stochastic·일목 (순수 파이썬) |
| `sentiment.py` | 팀원3: 종목 뉴스 재료 강도·호악재 (기존 team2 재사용) |
| `run.py` | 종합: confluence 스코어 → `web/data/predictions.json` (intraday_rank + closing_bet) |
| `backtest.py` | 예측 이력 ↔ 익일 실제 종가 대조 → 적중률·평균수익(`state/backtest.json`) + 점수 보정표(`state/calibration.json`) |
| `prompts/` | 5개 에이전트 시스템 프롬프트(팀원1~3·리더4·최종팀장) |

## 실행
```bash
python3 analyzer/run.py --dry-run            # 미리보기(/tmp)
python3 analyzer/run.py --top 12 --bet 5 --push   # predictions.json 작성 + push(배포)
```

## 장중 자동화 (cron, 기존 publish와 독립)
```
# 장중 15분: 예측 생성·게시 (run.py가 이력 기록 + 보정표 적용 + 백테스트 요약 임베드)
*/15 9-15 * * 1-5  cd ~/stocknews && /usr/bin/python3 analyzer/run.py --push >> /tmp/forecast.log 2>&1
# 장 시작 전 1회: 적중률·보정표 갱신 (전일까지 예측을 익일 실제와 대조)
50 8 * * 1-5       cd ~/stocknews && /usr/bin/python3 analyzer/backtest.py >> /tmp/backtest.log 2>&1
```
> 14:20 이후 실행분이 "종가베팅 확정"으로 사이트 `/forecast`에 강조됨(시간대 판정은 web `lib/market.ts`).
> **보정 루프**: backtest.py가 `calibration.json`을 만들면 run.py가 raw 점수를 **검증된 실제 적중률**로 치환(데이터 누적될수록 확률이 진짜에 수렴). `backtest.json` 요약은 `/forecast`에 "적중률 XX%"로 노출.

## 정직성
예측은 확률 게임(적중률 한계). "확실"이 아닌 **확률 우위 + 손절**. 정확도는 `backtest.py` 적중률 공개로 검증·개선.
