"""토론방 + 텔레그램 찌라시(미확인 루머) 수집 — best-effort. web/lib/stock/rumors.ts 로직 미러(최소).
모두 공개 소스(무시크릿). 실패는 빈 리스트로 흡수."""
import re
import urllib.request
import urllib.parse
import config  # noqa: F401

_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"


def _get(url, enc="utf-8"):
    try:
        return urllib.request.urlopen(
            urllib.request.Request(url, headers={"User-Agent": _UA}), timeout=8).read().decode(enc, "replace")
    except Exception:
        return ""


def _clean(s):
    s = re.sub(r"<[^>]+>", " ", s)
    for a, b in (("&amp;", "&"), ("&lt;", "<"), ("&gt;", ">"), ("&quot;", '"'), ("&#39;", "'")):
        s = s.replace(a, b)
    return re.sub(r"\s+", " ", s).strip()[:200]


def board(code, k=12):
    html = _get(f"https://finance.naver.com/item/board.naver?code={code}", "euc-kr")
    out = []
    for m in re.finditer(r'<a[^>]*read\.naver[^>]*title="([^"]+)"', html):
        t = _clean(m.group(1))
        if t:
            out.append(t)
        if len(out) >= k:
            break
    return out


def telegram(name, k=10, channel="FastStockNews"):
    if not name:
        return []
    html = _get(f"https://t.me/s/{channel}?q={urllib.parse.quote(name)}")
    out = []
    for m in re.finditer(r'tgme_widget_message_text[^>]*>(.*?)</div>', html, re.S):
        t = _clean(m.group(1))
        if name in t:
            out.append(t)
        if len(out) >= k:
            break
    return out


def gather(code, name):
    return {"board": board(code), "telegram": telegram(name)}
