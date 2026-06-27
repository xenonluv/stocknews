"""5분봉 양봉 스파크 — radar.py(aggregate_minute_bars/reignition_bars/_has_live_bars/_minute_bars_with_fallback)
로직을 복제(미러). ⚠ radar.py:85-159 산식 변경 시 동기화. 읽기전용(core 미수정).
스파크는 당일 분봉으로만 신뢰 포착(KIS 분봉=당일). UN→J 폴백(키스트론류 UN분봉0 누락 방지).
"""
import config  # noqa: F401 — 경로 부트스트랩
import kis_client as kis


def aggregate_minute_bars(bars, span_min):
    buckets = {}
    order = []
    for b in bars:
        t = b.get("time", "")
        if len(t) != 6 or not b.get("close"):
            continue
        hh, mm = int(t[:2]), int(t[2:4])
        mins = hh * 60 + mm
        start = 9 * 60
        if mins < start:
            continue
        idx = (mins - start) // span_min
        key_m = start + idx * span_min
        key = f"{key_m // 60:02d}{key_m % 60:02d}00"
        val = b["close"] * b["vol"]
        row = buckets.get(key)
        if row is None:
            buckets[key] = {"time": key, "open": b["open"], "high": b["high"],
                            "low": b["low"], "close": b["close"], "vol": b["vol"], "value": val}
            order.append(key)
        else:
            row["high"] = max(row["high"], b["high"])
            row["low"] = min(row["low"], b["low"])
            row["close"] = b["close"]
            row["vol"] += b["vol"]
            row["value"] += val
    return [buckets[k] for k in sorted(order)]


def reignition_bars(bars, body_pct_min=config.SPARK_BODY_PCT, span_min=config.SPARK_SPAN_MIN):
    out = []
    for bar in aggregate_minute_bars(bars, span_min):
        if bar["open"] <= 0 or bar["close"] <= bar["open"]:
            continue
        body = (bar["close"] - bar["open"]) / bar["open"] * 100
        if body < body_pct_min:
            continue
        out.append({"body_pct": round(body, 2),
                    "time": f"{bar['time'][:2]}:{bar['time'][2:4]}",
                    "value_eok": round(bar["value"] / 1e8),
                    "close": bar["close"], "open": bar["open"]})
    return out


def _has_live_bars(bars):
    return any((b.get("close") or 0) > 0 for b in bars)


def _minute_bars(code):
    """UN 우선, 결측 시 J 폴백 (radar._minute_bars_with_fallback 미러). (bars, source)."""
    bars = kis.minute_bars_today(code, market=kis.MONEY_MARKET)
    src = "kis_un"
    if kis.MONEY_MARKET != "J" and not _has_live_bars(bars):
        jb = kis.minute_bars_today(code, market="J")
        if _has_live_bars(jb):
            bars, src = jb, "kis_j"
    return bars, src


def spark_1430(code):
    """(count, max_body_pct, bars[], source) — 14:30↑ 5분 양봉 몸통%≥2% 스파크.
    분봉 결측(과거일·미체결)이면 (0,0,[],"none") — 날조 금지."""
    try:
        bars, src = _minute_bars(code)
    except Exception:
        return 0, 0.0, [], "none"
    if not _has_live_bars(bars):
        return 0, 0.0, [], "none"
    rb = reignition_bars(bars)
    rb1430 = [b for b in rb if b["time"] >= config.SPARK_START_HHMM]
    mx = max((b["body_pct"] for b in rb1430), default=0.0)
    return (len(rb1430), mx,
            [{"time": b["time"], "body_pct": b["body_pct"]} for b in rb1430], src)
