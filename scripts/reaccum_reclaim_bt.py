#!/usr/bin/env python3
"""reaccum '재돌파 진입' 근사 백테스트 (오프라인 전용).

사용자 핵심 전략: 폭발 후 "첫 식은 날"이 아니라, 식은 뒤 **15분봉 120선을 재돌파 확인한 뒤**
진입. 과거 분봉이 없어(KIS 당일·네이버 ~6세션) 정밀 검증 불가 → **일봉 이동평균 재상향 돌파로 근사**.
  · 근사 정의: 폭발(1천억+·고가13%) 후 window 내에, 종가가 직전일엔 MA 아래였다가 당일 MA 위로
    올라선 "재돌파(reclaim)" 날 진입. MA는 5일/20일 둘 다 비교.
  ⚠ 15분봉 120선 ≈ 일봉선과 다른 지표 — 방향성 참고용 근사. 정밀 검증은 분봉 수집 필요.

같은 폭발 표본에서 3가지 진입을 비교: (A)첫식은날 (B)5일선 재돌파 (C)20일선 재돌파.
룩어헤드 차단·기관 오버레이·forward는 reaccum_backtest와 동일.

사용: python3 scripts/reaccum_reclaim_bt.py [--kosdaq-only]
출력: stdout 비교표 + /tmp/reaccum_reclaim_bt.json
"""
import os
import sys
import json
import time
import argparse
import statistics as st

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kis_client as kis
import reaccum_backtest as base  # load_master·find_explosions·forward_returns·fetch_orgn_map 재사용

WINDOW = 6
CHG_MIN, CHG_MAX = -6.0, 10.0
RECLAIM_EXTRA = 4   # 재돌파는 첫식은날보다 며칠 더 걸릴 수 있어 탐색창 확장


def ma(closes, n):
    return sum(closes[-n:]) / n if len(closes) >= n else None


def first_cooldown(daily, peak_i, window):
    """(A) 폭발 후 첫 식음+MA20위 날 (reaccum_backtest와 동일 정의)."""
    for s in range(peak_i + 1, min(peak_i + window + 1, len(daily))):
        if s < 20:
            continue
        closes = [d["close"] for d in daily[:s + 1] if d.get("close")]
        if len(closes) < 21 or closes[-2] <= 0:
            continue
        chg = (closes[-1] / closes[-2] - 1) * 100
        if not (CHG_MIN <= chg <= CHG_MAX):
            continue
        if closes[-1] < ma(closes, 20):
            continue
        return s
    return None


def first_reclaim(daily, peak_i, window, ma_n):
    """(B/C) 폭발 후, 종가가 직전일 MA_n 아래 → 당일 MA_n 위로 '재돌파'한 첫 날.

    추세 재개 확인 진입. 식음 밴드도 함께 요구(과열 재급등 제외 위해 chg<=CHG_MAX)."""
    for s in range(peak_i + 1, min(peak_i + window + 1, len(daily))):
        if s < ma_n:
            continue
        closes = [d["close"] for d in daily[:s + 1] if d.get("close")]
        prev = [d["close"] for d in daily[:s] if d.get("close")]
        if len(closes) < ma_n + 1 or len(prev) < ma_n or closes[-2] <= 0:
            continue  # closes[-2]<=0 가드 — A(first_cooldown)와 동일, chg=0 오통과 차단
        ma_now, ma_prev = ma(closes, ma_n), ma(prev, ma_n)
        if ma_now is None or ma_prev is None:
            continue
        crossed = prev[-1] < ma_prev and closes[-1] >= ma_now   # 어제 아래 → 오늘 위
        chg = (closes[-1] / closes[-2] - 1) * 100   # closes[-2]>0 보장(상단 가드)
        if crossed and CHG_MIN <= chg <= CHG_MAX:   # A와 동일 식음밴드(급락 재돌파 제외)
            return s
    return None


def grpstat(grp):
    if not grp:
        return {"n": 0}
    r1 = sorted(g["ret1"] for g in grp)
    n = len(r1)
    r5 = [g["ret5"] for g in grp if g["ret5"] is not None]
    return {"n": n, "hit1": round(sum(1 for x in r1 if x > 0) / n * 100, 1),
            "avg1": round(sum(r1) / n, 2), "med1": round(st.median(r1), 2),
            "avg5": round(sum(r5) / len(r5), 2) if r5 else None}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--kosdaq-only", action="store_true")
    p = ap.parse_args()
    markets = ["KOSDAQ"] if p.kosdaq_only else ["KOSPI", "KOSDAQ"]
    base.log(f"[1/2] 마스터 {'+'.join(markets)}...")
    uni = base.load_master(markets)
    base.log(f"  유니버스 {len(uni)}종목")

    rows = {"A_cooldown": [], "B_reclaim_ma5": [], "C_reclaim_ma20": []}
    inv_cache = {}
    win = WINDOW + RECLAIM_EXTRA
    base.log("[2/2] 폭발→3진입 비교 스캔...")
    scanned = 0
    for code, name in uni.items():
        scanned += 1
        if scanned % 400 == 0:
            base.log(f"  ...{scanned}/{len(uni)}")
        try:
            daily = kis.daily_prices(code, days=base.DAILY_DAYS)
        except Exception:
            continue
        if len(daily) < 25:
            continue
        seenA, seenB, seenC = set(), set(), set()
        for peak_i, hp in base.find_explosions(daily, base.EXPLOSION_VALUE, base.EXPLOSION_HIGH_PCT):
            peak_date = daily[peak_i]["date"]
            for key, finder, seen in (
                ("A_cooldown", first_cooldown(daily, peak_i, WINDOW), seenA),
                ("B_reclaim_ma5", first_reclaim(daily, peak_i, win, 5), seenB),
                ("C_reclaim_ma20", first_reclaim(daily, peak_i, win, 20), seenC)):
                s = finder
                if s is None or s in seen:
                    continue
                seen.add(s)
                fwd = base.forward_returns(daily, s)
                if fwd["ret1"] is None:
                    continue
                flow = base.flow_after_peak(code, peak_date, daily[s]["date"], inv_cache)
                rows[key].append({"code": code, "name": name, "peak_date": peak_date,
                                  "signal_date": daily[s]["date"],
                                  "orgn_buy": bool(flow and flow["orgn"] > 0),
                                  "ivtr_buy": bool(flow and flow["ivtr"] > 0),
                                  "ivtr_frgn_buy": bool(flow and flow["ivtr"] > 0 and flow["frgn"] > 0),
                                  "ivtr_days": (flow["ivtr_days"] if flow else 0),
                                  "ivtr_won": (flow["ivtr_won"] if flow else 0),  # 백만원
                                  **fwd})
        time.sleep(0.04)

    out = {"universe_n": len(uni), "window_cooldown": WINDOW, "window_reclaim": win}
    print("=== reaccum 진입전략 비교 (일봉 근사) ===")
    print("유니버스 %d종목 · ⚠15분봉120선의 일봉MA 근사(방향성 참고)\n" % len(uni))
    print("%-26s %5s %7s %7s %7s %7s" % ("진입 × 수급필터", "n", "익적중", "평균", "중앙", "5일"))
    flt = (("", "  (필터없음)", lambda g: True),
           ("orgn_buy", "  +기관계", lambda g: g["orgn_buy"]),
           ("ivtr_buy", "  +투신순매수", lambda g: g["ivtr_buy"]),
           ("ivtr_d2", "  +투신 2일+매집", lambda g: g.get("ivtr_days", 0) >= 2),
           ("ivtr_d3", "  +투신 3일+매집", lambda g: g.get("ivtr_days", 0) >= 3),
           ("ivtr_w30", "  +투신누적 30억+", lambda g: g.get("ivtr_won", 0) >= 3000),
           ("ivtr_w100", "  +투신누적 100억+", lambda g: g.get("ivtr_won", 0) >= 10000),
           ("ivtr_frgn_buy", "  +투신&외인", lambda g: g["ivtr_frgn_buy"]))
    for key, label in (("A_cooldown", "A 첫식은날"),
                       ("B_reclaim_ma5", "B 5일선재돌파"),
                       ("C_reclaim_ma20", "C 20일선재돌파")):
        out[key] = {}
        allg = rows[key]
        print("─" * 64)
        for fk, flabel, fn in flt:
            grp = [g for g in allg if fn(g)]
            st = grpstat(grp)
            out[key][fk or "all"] = st
            if st.get("n"):
                warn = " ⚠표본부족" if st["n"] < 100 else ""
                name = (label if fk == "" else flabel)
                print("%-26s %5d %6s%% %6s%% %6s%% %6s%%%s" % (
                    name, st["n"], st["hit1"], st["avg1"], st["med1"], st["avg5"], warn))
    json.dump(out, open("/tmp/reaccum_reclaim_bt.json", "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    print("\n상세 → /tmp/reaccum_reclaim_bt.json")
    print("※ A=첫식은날 / B·C=MA 재상향돌파 진입(재돌파). 수급=폭발전후 순매수>0. n<100은 과적합 주의")


if __name__ == "__main__":
    main()
