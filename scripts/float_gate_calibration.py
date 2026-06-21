#!/usr/bin/env python3
"""③ 폭발 게이트 유통 회전율 임계(X) 데이터 캘리브레이션 — 1회성(cron 제외).

목적: 폭발 게이트를 '거래대금 ≥ 1,500억 OR 폭발일 유통 회전율 ≥ X%'로 넓힐 때, X를 추측이 아니라
데이터로 정한다. 두 분포를 본다:
  A) 확정 폭발(.explosion_registry.json, 이미 1,500억+ 통과) 의 폭발일 유통 회전율 분포
     → '진짜 폭발'의 유통 강도가 어느 수준인지. X는 이보다 높게 잡아야 게이트가 의미 있다.
  B) 오늘 유니버스(거래대금·등락률 상위)에서 +13%지만 1,500억 미달(sub-gate) 종목의 유통 회전율
     → 각 후보 X에서 '새로 등록될 종목 수'(flood 추정).

유통 회전율 = 폭발일 거래대금(UN) / (폭발일 시총 × 유동비율).
폭발일 시총 ≈ 현재시총 × (폭발일종가/현재가). 유동비율 = float_ratio(보통주만).
표준라이브러리만. 시크릿: KIS(.env).
"""
import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kis_client as kis        # noqa: E402
import float_ratio as fr        # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REG = os.path.join(REPO, ".explosion_registry.json")
GATE_EOK = 1500                 # 현재 절대 게이트(억)
HIGH_PCT = 13.0
X_CANDS = [50, 80, 100, 120, 150, 200]  # 후보 임계(유통 회전율 %)


def pct(xs, p):
    s = sorted(xs)
    return s[max(0, min(len(s) - 1, int(round((len(s) - 1) * p / 100))))] if s else None


def float_turnover(code, peak_date, peak_value_eok, now=None, daily=None):
    """폭발일 유통 회전율(%) | None. now/daily 재사용 가능."""
    f = fr.get_float_ratio(code)
    if not f:
        return None
    try:
        now = now or kis.price_now(code)
        daily = daily or {b["date"]: b for b in kis.daily_prices_jmoney_un(code, days=40)}
    except Exception:
        return None
    cap = float(now.get("market_cap_eok") or 0)
    npx = float(now.get("price") or 0)
    pbar = daily.get(peak_date)
    pclose = pbar["close"] if pbar else None
    pcap = (cap * pclose / npx) if (cap > 0 and pclose and npx > 0) else cap
    if pcap <= 0:
        return None
    return round(peak_value_eok / (pcap * f) * 100, 1)


def part_a():
    """확정 폭발(레지스트리)의 폭발일 유통 회전율 분포 — 코드별 최신 폭발 1건."""
    reg = json.load(open(REG, encoding="utf-8")).get("records", {})
    latest = {}  # code -> rec (peak_date 최신)
    for rec in reg.values():
        c = rec.get("code")
        if c and (c not in latest or rec.get("peak_date", "") > latest[c].get("peak_date", "")):
            latest[c] = rec
    vals = []
    for c, rec in latest.items():
        t = float_turnover(c, rec.get("peak_date"), float(rec.get("peak_value_eok") or 0))
        if t is not None:
            vals.append((t, c, rec.get("name")))
    vals.sort(reverse=True)
    ts = [v[0] for v in vals]
    print(f"\n=== A. 확정 폭발 {len(ts)}종목(보통주·유동비율 확보) 폭발일 유통 회전율 분포 ===")
    if ts:
        print(f"  중앙값 {pct(ts,50)}% · p25 {pct(ts,25)}% · p75 {pct(ts,75)}% · p90 {pct(ts,90)}% · max {max(ts)}%")
        for x in X_CANDS:
            n = sum(1 for t in ts if t >= x)
            print(f"  유통회전율 ≥ {x}%: {n}/{len(ts)}종목 ({n/len(ts)*100:.0f}%)")
        print("  상위 8:", [(v[2], v[0]) for v in vals[:8]])
    return ts


def part_b():
    """오늘 유니버스의 sub-gate(+13% & <1,500억) 종목 유통 회전율 → 후보 X별 신규등록(flood) 수."""
    codes = {}
    for mkt in ("KOSPI", "KOSDAQ"):
        try:
            for r in kis.value_rank_union(mkt, top_n=30):
                codes[r["code"]] = r["name"]
        except Exception:
            pass
    sub = []  # (유통회전율, code, name, 거래대금억)
    for c, name in codes.items():
        try:
            now = kis.price_now_jmoney_un(c)
        except Exception:
            continue
        hi, prev = now.get("high"), now.get("prev_close")
        if not hi or not prev:
            continue
        high_pct = (hi / prev - 1) * 100
        val_eok = (now.get("value") or 0) / 1e8
        if high_pct < HIGH_PCT or val_eok >= GATE_EOK:
            continue  # 폭발 아님 or 이미 절대게이트 통과
        f = fr.get_float_ratio(c)
        if not f:
            continue
        cap = float(now.get("market_cap_eok") or 0)
        if cap <= 0:
            continue
        t = round(val_eok / (cap * f) * 100, 1)
        sub.append((t, c, name, round(val_eok)))
    sub.sort(reverse=True)
    print(f"\n=== B. 오늘 sub-gate(+13% & <1,500억) {len(sub)}종목 (1,500억이면 이미 등록) ===")
    for x in X_CANDS:
        n = sum(1 for s in sub if s[0] >= x)
        print(f"  유통회전율 ≥ {x}%면 신규 등록: {n}종목")
    print("  목록:", [(s[2], f"{s[0]}%", f"{s[3]}억") for s in sub[:10]])
    return sub


def main():
    a = part_a()
    b = part_b()
    print("\n=== 권고 ===")
    if a:
        # X는 '확정 폭발의 유통 강도 상위권 + flood 억제' 절충 — 확정폭발 중앙값~p75 부근 + 사용자 직관(100%=유통 완전회전)
        print(f"  확정 폭발 유통회전율 중앙값 {pct(a,50)}% → X를 그 이상(100%대 권장: 유통주식 완전회전=자명한 매집)")
        print("  B의 신규등록 수가 적은(노이즈 억제) 최소 X를 택해 flood 방지. 최종 X는 위 표로 사람이 확정.")


if __name__ == "__main__":
    main()
