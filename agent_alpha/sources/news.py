"""종목 실시간 뉴스 헤드라인(네이버 공개 API, 무시크릿). 읽기전용."""
import json
import urllib.request
import config  # noqa: F401

_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"


def news(code, k=8):
    try:
        req = urllib.request.Request(
            f"https://m.stock.naver.com/api/news/stock/{code}?pageSize={k}&page=1",
            headers={"User-Agent": _UA})
        d = json.loads(urllib.request.urlopen(req, timeout=8).read())
        groups = d if isinstance(d, list) else [d]
        out = []
        for g in groups:
            for it in g.get("items", []):
                t = (it.get("title") or "").strip()
                if t:
                    out.append(t)
        return out[:k]
    except Exception:
        return []
