"""종가베팅 적합도 점수 (SSOT — quant 저장·calibrate 검증이 공유하는 단일 파이썬 산식).

⚠ web/components/alpha/AlphaList.tsx 의 `closeBetFitness` 와 **1:1 동기화**한다(산식 변경 시 양쪽 같이).
회장님 종가베팅 전략(22표본·2거래일) 근거 — 잠정 휴리스틱, 표시·전진검증 전용(core 통계 무관).

기준 50 + 가감:
  유형    reaccum +10 / youtong 0 / explosion -45(이미 폭발=식음, 하위로)
  2일회전 80~150% +15 / 40~80 +8 / <40 +3 / 150~250 -10 / 250%+ -5
  당일등락 0~+8% +15 / ≤-10%(깊은눌림) +12 / -10~0 +3 / +8~15 -20 / +15~22 -30 / +22%+ -40
          (올라갈수록 단조 강등 — 이미 오른 종목은 종가 추격 매수 불가·익일 갭 위험)
  14:30스파크 1~2회 +12 / 0회 +2 / 3회+ -8(과열) / 미측정(none) 미반영
  숨은외인매집 lv≥1 -5(현 표본 역신호)
결측 필드는 가점/감점 없이 통과(날조 금지). 최종 0~100 클램프.
"""


def _hidden_foreign(row):
    """키움 속 숨은 외인매집 강도(0~3). quant 저장값 우선, 결측(옛 행)이면 동일식 재계산."""
    hf = row.get("hidden_foreign_level")
    if hf is not None:
        return hf
    fn, gq, kc = row.get("frgn_net"), row.get("glob_net_qty"), row.get("kiwoom_buy_concentration")
    if fn is None or gq is None or kc is None:
        return 0
    if fn <= 0 or abs(gq) >= abs(fn) * 0.1 or kc < 0.3:
        return 0
    return 3 if fn >= 100000 else 2 if fn >= 30000 else 1


def close_bet_fitness(row):
    """정량 행(dict) → 종베 적합도 점수(int 0~100)."""
    s = 50
    mt = row.get("mover_type")
    if mt == "reaccum":
        s += 10
    elif mt == "explosion":
        s -= 45
    t = row.get("turnover_2d_pct")
    if t is not None:
        s += 15 if 80 <= t < 150 else 8 if 40 <= t < 80 else 3 if t < 40 else -10 if t < 250 else -5
    c = row.get("change_pct")
    if c is not None:
        s += 15 if 0 <= c < 8 else 12 if c <= -10 else 3 if c < 0 else -20 if c < 15 else -30 if c < 22 else -40
    if row.get("spark_source") not in (None, "none") and row.get("spark_1430_count") is not None:
        sc = row["spark_1430_count"]
        s += 12 if 1 <= sc <= 2 else 2 if sc == 0 else -8
    if _hidden_foreign(row) >= 1:
        s -= 5
    return max(0, min(100, s))
