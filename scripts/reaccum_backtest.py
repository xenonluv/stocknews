#!/usr/bin/env python3
"""reaccum 과거 백테스트 (오프라인 전용 — 프로덕션/registry/git 무관).

가설: "최근 N거래일 내 거래대금 1천억+ AND 고가등락 13%+ 폭발 → 식은 구간(−6~+10%)에서
MA20 위 + 폭발후 기관 순매수 → 익일/N일 상승" 이 실제 엣지가 있는가.

데이터:
  - 유니버스: KIS 종목 마스터(공개 URL, 코스피+코스닥 전 종목) — --kosdaq-only로 축소 가능
  - 가격/거래대금: kis.daily_prices(5~6개월, value·high) → 폭발·식음·MA20·수익률 백필
  - 기관 수급: investor-trade-by-stock-daily(FHPTJ04160001, 날짜형 페이징) → 6개월 orgn 백필

룩어헤드 차단: 신호일 s 판정은 s까지 데이터만, 수익률은 s+1 이후만. MA20=closes[s-19..s].

사용:
  python3 scripts/reaccum_backtest.py                 # 전 시장(코스피+코스닥)
  python3 scripts/reaccum_backtest.py --kosdaq-only
출력: stdout 요약 + /tmp/reaccum_backtest.json. git/푸시 없음.
"""
import os
import sys
import json
import time
import zipfile
import argparse
import urllib.request
from io import BytesIO
from datetime import datetime as _dt, timedelta as _td

ORGN_PRE_DAYS = 4   # 폭발 "전후" — 폭발일 이 칼렌더일 전부터(매집 구간) ~ 신호일까지 기관 합산

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kis_client as kis

EXPLOSION_VALUE = 100_000_000_000   # 1천억 (원)
EXPLOSION_HIGH_PCT = 13.0
WINDOW = 6                          # 폭발 후 식음 신호 탐색 거래일
CHG_MIN, CHG_MAX = -6.0, 10.0       # 식음 밴드
DAILY_DAYS = 130                    # ~6개월 일봉
ORGN_PAGES = 6                      # 기관 페이징 최대 (30행×6 ≈ 6개월)
INV_PATH = "/uapi/domestic-stock/v1/quotations/investor-trade-by-stock-daily"
MASTER_URLS = {
    "KOSPI": "https://new.real.download.dws.co.kr/common/master/kospi_code.mst.zip",
    "KOSDAQ": "https://new.real.download.dws.co.kr/common/master/kosdaq_code.mst.zip",
}
JUNK = ("스팩", "SPAC")


def log(m):
    print(m, file=sys.stderr, flush=True)


def parse_master_line(line):
    """KIS 마스터 1행에서 6자리 주권(ST) 종목만 (code, name)으로 반환."""
    if len(line) < 63:
        return None
    code = line[0:9].decode("euc-kr", "ignore").strip()
    name = line[21:61].decode("euc-kr", "ignore").strip()
    product_type = line[61:63].decode("euc-kr", "ignore").strip()
    if product_type != "ST":
        return None
    if not (code and name and code.isdigit() and len(code) == 6):
        return None
    if any(j in name for j in JUNK):
        return None
    if name.endswith("우") or name.endswith("우B") or "우선주" in name:
        return None
    return code, name


def load_master(markets):
    """KIS 마스터(공개 URL)에서 6자리 일반 주권 코드·명만 로드."""
    uni = {}
    for mkt in markets:
        try:
            with urllib.request.urlopen(MASTER_URLS[mkt], timeout=60) as r:
                content = r.read()
            with zipfile.ZipFile(BytesIO(content)) as zf:
                raw = zf.read(zf.namelist()[0])
        except Exception as e:
            log(f"[warn] {mkt} 마스터 다운로드 실패: {e}")
            continue
        n = 0
        for line in raw.split(b"\n"):
            parsed = parse_master_line(line)
            if parsed is None:
                continue
            code, name = parsed
            uni[code] = name
            n += 1
        log(f"  {mkt}: {n}종목")
        time.sleep(0.3)
    return uni


def find_explosions(daily, value_min, high_min):
    exps = []
    for i in range(1, len(daily)):
        prev_close = daily[i - 1].get("close") or 0
        bar = daily[i]
        if prev_close <= 0 or not bar.get("high") or bar.get("value") is None:
            continue
        high_pct = (bar["high"] / prev_close - 1) * 100
        if bar["value"] >= value_min and high_pct >= high_min:
            exps.append((i, high_pct))
    return exps


def first_reaccum_signal(daily, peak_i, window):
    """폭발 후 window 내 첫 식음+MA20 신호일 인덱스 (룩어헤드 차단). 없으면 None."""
    for s in range(peak_i + 1, min(peak_i + window + 1, len(daily))):
        if s < 20:
            continue
        closes = [d["close"] for d in daily[:s + 1] if d.get("close")]
        if len(closes) < 21 or closes[-2] <= 0:
            continue
        chg = (closes[-1] / closes[-2] - 1) * 100
        if not (CHG_MIN <= chg <= CHG_MAX):
            continue
        if closes[-1] < sum(closes[-20:]) / 20:
            continue
        return s
    return None


def forward_returns(daily, s):
    base = daily[s]["close"]
    out = {}
    for h in (1, 3, 5):
        nb = daily[s + h] if s + h < len(daily) else None
        out[f"ret{h}"] = round((nb["close"] / base - 1) * 100, 2) if nb and nb.get("close") else None
    out["hit1"] = out["ret1"] is not None and out["ret1"] > 0
    return out


def fetch_orgn_map(code, since, cache):
    """investor-trade-by-stock-daily 날짜형 페이징으로 6개월 일자별 기관순매수 맵. 캐시."""
    if code in cache:
        return cache[code]
    out = {}
    cursor = kis._today() if hasattr(kis, "_today") else None
    cursor = None  # 첫 콜은 최신부터
    try:
        for _ in range(ORGN_PAGES):
            params = {"FID_COND_MRKT_DIV_CODE": "J", "FID_INPUT_ISCD": code,
                      "FID_INPUT_DATE_1": cursor or "", "FID_ORG_ADJ_PRC": "", "FID_ETC_CLS_CODE": ""}
            res = kis._call(INV_PATH, "FHPTJ04160001", params)
            rows = res.get("output2") or res.get("output1") or res.get("output") or []
            if not rows:
                break
            dates = []
            for r in rows:
                d = (r.get("stck_bsop_date") or "").strip()
                if d:
                    out[d] = {"orgn": float(r.get("orgn_ntby_qty") or 0),
                              "frgn": float(r.get("frgn_ntby_qty") or 0),
                              "ivtr": float(r.get("ivtr_ntby_qty") or 0),       # 투신 수량
                              "ivtr_won": float(r.get("ivtr_ntby_tr_pbmn") or 0)}  # 투신 순매수 금액(백만원)
                    dates.append(d)
            if not dates:
                break
            oldest = min(dates)
            if oldest <= since:
                break
            cursor = oldest  # 다음 페이지는 oldest 이전
            time.sleep(0.06)
    except Exception as e:
        log(f"  [warn] {code} 기관 조회 실패: {e}")
    cache[code] = out
    return out


def flow_after_peak(code, peak_date, signal_date, cache, key="orgn"):
    """폭발 '전후' 특정 투자자(key=orgn/frgn/ivtr) 순매수 합. 창=[폭발일 −ORGN_PRE_DAYS, 신호일].

    기관 매집은 보통 폭발 직전~당일에 일어나므로 '폭발 이후'만 보면 매집을 놓친다(전후 창).
    반환 dict: {orgn, frgn, ivtr} 합 (커버 못 하면 None).
    """
    lo = (_dt.strptime(peak_date, "%Y%m%d") - _td(days=ORGN_PRE_DAYS)).strftime("%Y%m%d")
    m = fetch_orgn_map(code, since=lo, cache=cache)
    if not m or min(m) > lo:  # 창 시작(lo)까지 못 닿음 → 폭발전 매집 과소집계 위험 → unknown
        return None
    agg = {"orgn": 0.0, "frgn": 0.0, "ivtr": 0.0, "ivtr_won": 0.0,
           "ivtr_days": 0}  # ivtr_days = 투신 순매수(>0)한 날 수
    for d, v in m.items():
        if lo <= d <= signal_date:
            for k in ("orgn", "frgn", "ivtr", "ivtr_won"):
                agg[k] += v.get(k, 0.0)
            if v.get("ivtr", 0) > 0:
                agg["ivtr_days"] += 1
    return agg


def orgn_after_peak(code, peak_date, signal_date, cache):
    """하위호환(reclaim 스크립트용): 기관계 합만 반환."""
    a = flow_after_peak(code, peak_date, signal_date, cache)
    return None if a is None else a["orgn"]


def stats(grp):
    n = len(grp)
    if not n:
        return {"n": 0}
    r3 = [g["ret3"] for g in grp if g["ret3"] is not None]
    r5 = [g["ret5"] for g in grp if g["ret5"] is not None]
    r1 = sorted(g["ret1"] for g in grp)
    med = r1[len(r1) // 2] if len(r1) % 2 else round((r1[len(r1) // 2 - 1] + r1[len(r1) // 2]) / 2, 2)
    return {"n": n,
            "hit1_rate": round(sum(1 for g in grp if g["hit1"]) / n * 100, 1),
            "avg_ret1": round(sum(r1) / n, 2), "median_ret1": med,
            "avg_ret3": round(sum(r3) / len(r3), 2) if r3 else None,
            "avg_ret5": round(sum(r5) / len(r5), 2) if r5 else None}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--kosdaq-only", action="store_true")
    ap.add_argument("--explosion-value", type=float, default=EXPLOSION_VALUE)
    ap.add_argument("--explosion-high-pct", type=float, default=EXPLOSION_HIGH_PCT)
    ap.add_argument("--window", type=int, default=WINDOW)
    p = ap.parse_args()

    markets = ["KOSDAQ"] if p.kosdaq_only else ["KOSPI", "KOSDAQ"]
    log(f"[1/3] 종목 마스터 다운로드 ({'+'.join(markets)})...")
    universe = load_master(markets)
    log(f"  유니버스 {len(universe)}종목")

    signals, inv_cache, err, scanned = [], {}, 0, 0
    log("[2/3] 폭발→식음 신호 탐색 + 기관 백필...")
    for code, name in universe.items():
        scanned += 1
        if scanned % 300 == 0:
            log(f"  ...{scanned}/{len(universe)} 스캔, 신호 {len(signals)}건")
        try:
            daily = kis.daily_prices(code, days=DAILY_DAYS)
        except Exception:
            err += 1
            continue
        if len(daily) < 25:
            continue
        seen = set()
        for peak_i, high_pct in find_explosions(daily, p.explosion_value, p.explosion_high_pct):
            s = first_reaccum_signal(daily, peak_i, p.window)
            if s is None or s in seen:
                continue
            seen.add(s)
            fwd = forward_returns(daily, s)
            if fwd["ret1"] is None:
                continue
            peak_date, signal_date = daily[peak_i]["date"], daily[s]["date"]
            flow = flow_after_peak(code, peak_date, signal_date, inv_cache)
            signals.append({"code": code, "name": name, "peak_date": peak_date,
                            "peak_high_pct": round(high_pct, 1),
                            "peak_value_eok": round(daily[peak_i]["value"] / 1e8),
                            "signal_date": signal_date,
                            "signal_chg": round((daily[s]["close"] / daily[s - 1]["close"] - 1) * 100, 2),
                            "orgn_net_after_peak": (int(flow["orgn"]) if flow else None),
                            "frgn_net_after_peak": (int(flow["frgn"]) if flow else None),
                            "ivtr_net_after_peak": (int(flow["ivtr"]) if flow else None), **fwd})
        time.sleep(0.04)

    known = [g for g in signals if g["orgn_net_after_peak"] is not None]
    def slc(key):  # 투자자 유형별 순매수>0 그룹
        return stats([g for g in known if (g.get(key) or 0) > 0])
    report = {"params": {"explosion_value_eok": round(p.explosion_value / 1e8),
                         "explosion_high_pct": p.explosion_high_pct, "window": p.window,
                         "chg_band": [CHG_MIN, CHG_MAX], "markets": markets},
              "universe_n": len(universe), "errors": err,
              "all_signals": stats(signals), "coverage": f"{len(known)}/{len(signals)}",
              "orgn_buy": slc("orgn_net_after_peak"), "frgn_buy": slc("frgn_net_after_peak"),
              "ivtr_buy": slc("ivtr_net_after_peak"),
              "ivtr_and_frgn_buy": stats([g for g in known
                  if (g.get("ivtr_net_after_peak") or 0) > 0 and (g.get("frgn_net_after_peak") or 0) > 0]),
              "signals": sorted(signals, key=lambda g: g["signal_date"])}
    json.dump(report, open("/tmp/reaccum_backtest.json", "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)

    a = report["all_signals"]
    print("=== reaccum 전 시장 백테스트 (투자자 유형별) ===")
    print("유니버스 %d종목(에러 %d) · 신호 %d건 (임계 %d억·%s%%·%d일창) · 커버 %s" % (
        len(universe), err, len(signals), report["params"]["explosion_value_eok"],
        p.explosion_high_pct, p.window, report["coverage"]))
    if a.get("n"):
        print("\n[전체 %d건] 익일적중 %s%% · 평균 %s%% · 중앙 %s%% · 5일 %s%%" % (
            a["n"], a["hit1_rate"], a["avg_ret1"], a["median_ret1"], a["avg_ret5"]))
    print("\n%-22s %6s %8s %8s %8s %8s" % ("폭발전후 순매수>0", "n", "익일적중", "평균익", "중앙익", "5일익"))
    for key, label in (("orgn_buy", "기관계"), ("frgn_buy", "외국인"),
                       ("ivtr_buy", "투신"), ("ivtr_and_frgn_buy", "투신+외국인")):
        g = report[key]
        if g.get("n"):
            print("%-22s %6d %7s%% %7s%% %7s%% %7s%%" % (
                label, g["n"], g["hit1_rate"], g["avg_ret1"], g["median_ret1"], g["avg_ret5"]))
    print("\n상세 → /tmp/reaccum_backtest.json")


if __name__ == "__main__":
    main()
