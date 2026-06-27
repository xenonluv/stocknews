"""전진수집 정량 행 생성 — (code,date)당 캔들·유통회전율·14:30스파크·투자자별·거래원·레짐.
유통회전율(거래량/유통주식수)이 1순위 신호. 모든 KIS 호출은 읽기전용. 실패는 null로 흡수(날조 금지)."""
import config
import kis_client as kis
import float_ratio
import sparks_min
import kis_extra


def _wick(o, h, l, c):
    span = h - l
    if span <= 0:
        return None, None, None
    cs = round((c - l) / span, 3)                 # 종가강도(받힘): 0=저점마감, 1=고점마감
    bt, bb = max(o, c), min(o, c)
    uw = round((h - bt) / span, 3)                # 실윗꼬리(상단 거부)
    lw = round((bb - l) / span, 3)                # 실아랫꼬리(저점 받힘)
    return cs, uw, lw


def build(mover, fcache, reg):
    """mover={code,name,sector,mover_type}, fcache=float 자체캐시 dict, reg=regime dict → 정량 행 dict."""
    code = mover["code"]
    row = {"code": code, "name": mover.get("name") or code, "sector": mover.get("sector", ""),
           "mover_type": mover.get("mover_type"), "date": config.today_yyyymmdd(),
           "captured_at": config.now_iso(), "labeled": False}

    try:
        d = kis.daily_prices_jmoney_un(code, days=3)   # 가격=J / 거래량·거래대금=UN
    except Exception:
        d = []
    if len(d) < 2:
        row["data_ok"] = False
        return row
    t, p = d[-1], d[-2]
    row["date"] = t.get("date") or row["date"]   # 신호일 = 마지막 일봉 날짜(비거래일/마감후 wall-clock 어긋남 방지)
    o, h, l, c, pc = t.get("open"), t.get("high"), t.get("low"), t.get("close"), p.get("close")
    row.update({
        "open": o, "high": h, "low": l, "close": c, "prev_close": pc,
        "change_pct": round((c / pc - 1) * 100, 2) if (pc and c) else None,
        "high_pct": round((h / pc - 1) * 100, 2) if (pc and h) else None,
        "is_eumbong": bool(c is not None and o is not None and c < o),
        "below_prev": bool(c is not None and pc is not None and c < pc),
        "volume": t.get("volume"),
        "value_eok": round((t.get("value") or 0) / 1e8),
    })
    # OHLC가 모두 유효(양수)하고 high>low일 때만 꼬리 산출 — 결측(_f→0.0)을 0으로 강제하면 종가강도 오염.
    if all(isinstance(x, (int, float)) and x > 0 for x in (o, h, l, c)) and h > l:
        cs, uw, lw = _wick(o, h, l, c)
    else:
        cs, uw, lw = None, None, None
    row["close_strength"], row["upper_wick_pct"], row["lower_wick_pct"] = cs, uw, lw

    # ── 유통회전율(1순위) ── float 자체캐시 전달 → 코어 data/float_ratio.json 디스크쓰기 회피
    fr, listed = float_ratio.get_float_and_listed(code, cache=fcache)
    fs = (listed * fr) if (fr and listed) else None
    row["float_ratio"] = fr
    row["float_shares"] = round(fs) if fs else None
    row["turnover_pct"] = float_ratio.vol_turnover(t.get("volume"), fr, listed)
    v2 = (t.get("volume") or 0) + (p.get("volume") or 0)
    row["turnover_2d_pct"] = round(v2 / fs * 100, 1) if fs else None

    # ── 14:30↑ 5분 스파크(당일 분봉) ──
    cnt, mx, bars, src = sparks_min.spark_1430(code)
    row.update({"spark_1430_count": cnt, "spark_max_body_pct": mx,
                "spark_bars": bars, "spark_source": src})

    # ── 투자자별(당일; 결측 시 null — 날조 금지. label.py는 익일봉만 채우고 수급은 보강하지 않음) ──
    try:
        inv = kis.investor_daily(code)
    except Exception:
        inv = []
    last = inv[-1] if inv else None
    if last and last.get("date") == row["date"]:
        row.update({"frgn_net": last.get("frgn"), "orgn_net": last.get("orgn"), "prsn_net": last.get("prsn")})
    else:
        row.update({"frgn_net": None, "orgn_net": None, "prsn_net": None})

    # ── 거래원(당일 스냅샷) ──
    mem = kis_extra.inquire_member(code) or {}
    row.update({"kiwoom_buy_concentration": mem.get("kiwoom_buy_concentration"),
                "kiwoom_is_top_buyer": mem.get("kiwoom_is_top_buyer"),
                "glob_net_qty": mem.get("glob_net_qty"), "glob_buy_rlim": mem.get("glob_buy_rlim"),
                "top_buyers": mem.get("top_buyers"), "top_sellers": mem.get("top_sellers")})

    row.update(reg or {})
    row["data_ok"] = True
    return row
