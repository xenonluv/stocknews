#!/usr/bin/env python3
"""눌림목/저점 진입 스크리너.

조건 (모두 충족):
  A) 최근 5거래일 중 하루라도 '거래량 급증 + 강한 상승' 이력 (거래량/상승률 상위 근사)
  B) 충분한 재료 뉴스 (최근 뉴스 N건 이상)
  C) 3분봉 MA60 >= MA120 (정배열) + 최근 골든크로스 발생 + 이격도 작음(갓 교차)

데이터: 네이버 (랭킹/일봉/뉴스/분봉). 분봉은 fchart 멀티데이(1분) → 3분봉 합성.
주의: 3분봉 GC는 본질적으로 '최신 장 세션' 기준. 주말이면 직전 거래일 데이터.

사용:
  python3 scripts/screener.py                 # 현재 상위 유니버스로 스캔
  python3 scripts/screener.py --names 삼성전자 코칩 ...   # 관심종목 추가
  python3 scripts/screener.py --topn 20 --gc-window 20 --disp-max 1.0
"""
import re
import sys
import json
import urllib.request
from collections import defaultdict

from team3_price_context import fetch_daily, ma
from team1_collect import resolve_code, fetch_news, top_ranking
from team2_relevance import score_news, make_aliases

UA = {"User-Agent": "Mozilla/5.0", "Referer": "https://m.stock.naver.com/"}

# ---- 임계값 (기본값, 결과 보며 튜닝) ----
MIN_TRADING_VALUE = 50_000_000_000  # A: 최근 5일 일봉 거래대금 최대치 ≥ 500억 (잡주 제외)
HIST_VOL_X = 2.0      # A: 거래량 급증 배수(20일 평균 대비)
HIST_GAIN = 5.0       # A: 강한 상승(%)
NEWS_MIN = 3          # B: 최소 재료 뉴스 수
GC_WINDOW = 20        # C: 최근 N개 3분봉 내 골든크로스 발생
DISP_MAX = 1.0        # C: 이격도 상한 (MA60/MA120-1)*100, 갓 교차
DISP_MIN = 0.0        # C: 이격도 하한(정배열)


def fetch_min3_closes(code, count=1500):
    """fchart 1분봉 → 3분봉 종가 시계열."""
    url = f"https://fchart.stock.naver.com/sise.nhn?symbol={code}&timeframe=minute&count={count}&requestType=0"
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=20) as r:
        x = r.read().decode("utf-8", "ignore")
    rows = re.findall(r'data="(\d{12})\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|(\d*)"', x)
    # (dt, open, high, low, close, vol) — close 사용
    bars = []
    for dt, o, h, l, c, v in rows:
        if c and c != "null":
            bars.append((dt, float(c)))
    bars.sort()
    # 3분봉 버킷: (YYYYMMDDHH, minute//3) 단위, 각 버킷 마지막 close
    buckets = {}
    order = []
    for dt, c in bars:
        key = dt[:10] + str(int(dt[10:12]) // 3)  # YYYYMMDDHH + (분//3)
        if key not in buckets:
            order.append(key)
        buckets[key] = c
    return [buckets[k] for k in order]


def filter_A(code):
    """최근 5거래일 거래량급증+강상승 이력 (근사)."""
    try:
        d = fetch_daily(code, days=60)
    except Exception as e:
        return {"hit": False, "err": str(e)}
    if len(d) < 21:
        return {"hit": False, "reason": "데이터부족"}
    closes = [x["close"] for x in d]
    vols = [x["volume"] for x in d]
    # 거래대금 게이트: 최근 5거래일 일봉 거래대금(종가×거래량) 최대치 ≥ 기준
    val5 = [closes[i] * vols[i] for i in range(len(d) - 5, len(d))]
    max_val = max(val5)
    if max_val < MIN_TRADING_VALUE:
        return {"hit": False, "reason": "거래대금미달", "value_eok": round(max_val / 1e8)}
    for i in range(len(d) - 1, max(len(d) - 6, 0), -1):  # 최근 5거래일
        vavg = sum(vols[max(0, i - 20):i]) / max(1, len(vols[max(0, i - 20):i]))
        vol_x = vols[i] / vavg if vavg else 0
        chg = (closes[i] / closes[i - 1] - 1) * 100 if i > 0 else 0
        if vol_x >= HIST_VOL_X and chg >= HIST_GAIN:
            return {"hit": True, "date": d[i]["date"], "vol_x": round(vol_x, 1),
                    "gain": round(chg, 1), "value_eok": round(max_val / 1e8)}
    return {"hit": False}


def filter_B(code, name):
    """팀원2 자동 재료 필터: 시황/일반 제거 + 종목명(별칭) 언급 검사 후 '관련 재료'만."""
    news = [n for n in fetch_news(code, 12) if n.get("title")]
    res = score_news(news, make_aliases(name))
    return {"hit": res["relevant_count"] >= NEWS_MIN,
            "count": res["relevant_count"],
            "news": res["relevant"],
            "importance": res["importance_score"],
            "impact": res["impact_level"],
            "sentiment": res["sentiment"]}


def filter_C(code):
    try:
        closes3 = fetch_min3_closes(code)
    except Exception as e:
        return {"hit": False, "err": str(e)}
    if len(closes3) < 121:
        return {"hit": False, "reason": f"3분봉부족({len(closes3)})"}
    ma60 = [ma(closes3[:i + 1], 60) for i in range(len(closes3))]
    ma120 = [ma(closes3[:i + 1], 120) for i in range(len(closes3))]
    now60, now120 = ma60[-1], ma120[-1]
    if not now60 or not now120:
        return {"hit": False, "reason": "MA미정"}
    disp = (now60 / now120 - 1) * 100
    aligned = now60 >= now120
    # 최근 GC_WINDOW 내 골든크로스(아래→위) 발생 여부
    crossed = False
    cross_idx = None
    start = max(120, len(closes3) - GC_WINDOW)
    for i in range(start, len(closes3)):
        if ma60[i - 1] is not None and ma120[i - 1] is not None:
            if ma60[i - 1] < ma120[i - 1] and ma60[i] >= ma120[i]:
                crossed = True
                cross_idx = i
    hit = aligned and crossed and (DISP_MIN <= disp <= DISP_MAX)
    return {"hit": hit, "aligned": aligned, "gc_recent": crossed,
            "disparity_pct": round(disp, 3), "bars": len(closes3),
            "cross_ago_bars": (len(closes3) - 1 - cross_idx) if cross_idx else None}


def _arg(args, key, default, cast=float):
    return cast(args[args.index(key) + 1]) if key in args else default


def fetch_sector(code):
    """업종명 (네이버 데스크톱 종목 페이지에서 추출)."""
    try:
        url = f"https://finance.naver.com/item/main.naver?code={code}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        raw = urllib.request.urlopen(req, timeout=10).read()
        for enc in ("utf-8", "cp949"):
            try:
                html = raw.decode(enc)
            except Exception:
                continue
            m = re.search(r'type=upjong&no=\d+">([^<]+)', html)
            if m:
                return m.group(1).strip()
        return "기타"
    except Exception:
        return "기타"


def main():
    global HIST_VOL_X, HIST_GAIN, NEWS_MIN, GC_WINDOW, DISP_MAX, DISP_MIN, MIN_TRADING_VALUE
    args = sys.argv[1:]
    topn = int(_arg(args, "--topn", 20, int))
    # 임계값 오버라이드
    MIN_TRADING_VALUE = _arg(args, "--min-value", MIN_TRADING_VALUE)
    HIST_VOL_X = _arg(args, "--vol-x", HIST_VOL_X)
    HIST_GAIN = _arg(args, "--gain", HIST_GAIN)
    NEWS_MIN = _arg(args, "--news-min", NEWS_MIN, int)
    GC_WINDOW = _arg(args, "--gc-window", GC_WINDOW, int)
    DISP_MAX = _arg(args, "--disp-max", DISP_MAX)
    DISP_MIN = _arg(args, "--disp-min", DISP_MIN)
    watch = []
    if "--names" in args:
        i = args.index("--names")
        for nm in args[i + 1:]:
            if nm.startswith("--"):
                break
            watch.append(nm)

    # 유니버스: 현재 거래대금/상승률 상위 (KOSPI+KOSDAQ) ∪ 관심종목
    uni = {}
    for sort_key in ("거래대금", "상승률"):
        for mkt in ("KOSPI", "KOSDAQ"):
            try:
                for r in top_ranking(sort_key, mkt, topn):
                    if r.get("code"):
                        uni[r["code"]] = r["name"]
            except Exception:
                pass
    for nm in watch:
        c = resolve_code(nm)
        if c:
            uni[c] = nm

    print(f"[유니버스] {len(uni)}개 | 임계값: 거래량x{HIST_VOL_X} 상승{HIST_GAIN}% / 뉴스>={NEWS_MIN} / GC최근{GC_WINDOW}봉 이격도<={DISP_MAX}%", file=sys.stderr)

    passed = []
    by_sector = defaultdict(list)
    for code, name in uni.items():
        sector = fetch_sector(code)
        a = filter_A(code)
        rec = {"name": name, "code": code, "sector": sector, "A_hit": a.get("hit")}
        if a.get("hit"):
            rec["A"] = a
            b = filter_B(code, name)
            c = filter_C(code)
            rec["B_news"] = b.get("count")
            rec["importance"] = b.get("importance")
            rec["impact"] = b.get("impact")
            rec["sentiment"] = b.get("sentiment")
            rec["news"] = [{"title": n["title"], "url": n.get("url"),
                            "office": n.get("office"), "sentiment": n.get("sentiment")}
                           for n in b.get("news", [])[:4]]
            rec["C"] = {k: c.get(k) for k in ("aligned", "gc_recent", "disparity_pct", "cross_ago_bars")}
            if a["hit"] and b["hit"] and c["hit"]:
                rec["tier"] = "✅통과"
                passed.append(rec)
            elif b.get("hit") and c.get("aligned"):
                rec["tier"] = "근접(정배열·GC아님)"
            else:
                rec["tier"] = "A통과/차트미달"
        else:
            rec["tier"] = "A탈락"
        by_sector[sector].append(rec)

    # 업종별 정렬: 통과/근접 많은 섹터 우선
    rank = {"✅통과": 0, "근접(정배열·GC아님)": 1, "A통과/차트미달": 2, "A탈락": 3}
    grouped = {}
    for sec, recs in by_sector.items():
        recs.sort(key=lambda r: rank.get(r["tier"], 9))
        grouped[sec] = recs
    grouped = dict(sorted(grouped.items(), key=lambda kv: min(rank.get(r["tier"], 9) for r in kv[1])))

    print(json.dumps({
        "thresholds": {"vol_x": HIST_VOL_X, "gain": HIST_GAIN, "news_min": NEWS_MIN,
                       "gc_window": GC_WINDOW, "disp_max": DISP_MAX},
        "universe_size": len(uni),
        "passed": passed,
        "by_sector": grouped,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
