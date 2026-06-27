"""시장 레짐 — 코스피/코스닥 당일 등락률(네이버 공개 API, 무시크릿). 읽기전용."""
import json
import urllib.request
import config  # noqa: F401

_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"


def _idx_chg(market):
    try:
        req = urllib.request.Request(f"https://m.stock.naver.com/api/index/{market}/basic",
                                     headers={"User-Agent": _UA})
        d = json.loads(urllib.request.urlopen(req, timeout=8).read())
        v = float(str(d.get("fluctuationsRatio") or "").replace(",", ""))
        return round(v, 2)
    except Exception:
        return None


def regime():
    return {"kospi_chg": _idx_chg("KOSPI"), "kosdaq_chg": _idx_chg("KOSDAQ")}
