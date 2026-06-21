#!/usr/bin/env python3
"""NXT 시간외(야간) 급락 텔레그램 경고 — 정규장 마감 후 대응 사각지대 보완.

레이더가 낮(정규장)에 포착·게시한 종목이 NXT 애프터마켓(~20:00)에서 급락해도 시스템은 KRX 종가만
보여 익일 갭을 깜깜이로 놓친다(예: 화신 6/19 KRX 14,330 → NXT 야간 13,500, −5.8%). 이 스크립트는
장 마감 후 cron으로 돌며, **오늘 레이더 후보 + 추적 watchlist**의 야간가를 네이버에서 읽어 정규장 종가
대비 임계(−3%) 이상 빠진 종목을 텔레그램으로 1회 경고한다.

소스: 네이버 `m.stock.naver.com/api/stock/{code}/basic`의 overMarketPriceInfo(웹 야간 배지와 동일 출처).
      KIS·시크릿 불필요(가격 데이터). 텔레그램 송신만 Mac .env(TELEGRAM_*) — 미설정 시 조용히 skip.
디둡: .night_alert_notified.json(date:code) — 같은 종목 같은 밤 1회만(30분 간격 cron 스팸 방지).
표시·경고 전용: 레이더 점수·통계와 무관(가격은 여전히 KRX 공식 기준).
"""
import os
import sys
import json
import urllib.parse
import urllib.request
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import telegram_notify as tg  # noqa: E402 — send/load_env/_load_state/_save_state/log 재사용

KST = timezone(timedelta(hours=9))
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RADAR_JSON = os.path.join(REPO, "web", "data", "radar.json")
STATE_PATH = os.path.join(REPO, ".night_alert_notified.json")
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")
DROP_PCT = -3.0  # 정규장 종가 대비 이 % 이하로 빠지면 경고(야간 급락 하한)


def _num(s):
    """'14,330'·'-1,280' → float. 실패 시 None."""
    if isinstance(s, (int, float)):
        return float(s)
    if not isinstance(s, str):
        return None
    c = s.replace(",", "").strip()
    try:
        return float(c)
    except ValueError:
        return None


def _get_json(url, timeout=8):
    req = urllib.request.Request(url, headers={"User-Agent": UA,
                                               "Accept": "application/json, text/plain, */*"})
    return json.load(urllib.request.urlopen(req, timeout=timeout))


def radar_codes():
    """오늘 레이더가 게시한 수상종목 코드·이름. radar.json 없거나 손상이면 빈 dict."""
    try:
        d = json.load(open(RADAR_JSON, encoding="utf-8"))
    except Exception as e:
        tg.log(f"[night] radar.json 읽기 실패: {e}")
        return {}
    return {s["code"]: s.get("name") or s["code"]
            for s in d.get("suspects", []) if s.get("code")}


def watchlist_codes():
    """추적 watchlist(Upstash KV) — best-effort(미설정·실패 시 빈 dict)."""
    url = os.environ.get("KV_REST_API_URL")
    tok = os.environ.get("KV_REST_API_READ_ONLY_TOKEN") or os.environ.get("KV_REST_API_TOKEN")
    if not url or not tok:
        return {}
    try:
        req = urllib.request.Request(f"{url.rstrip('/')}/smembers/track:watchlist",
                                     headers={"Authorization": f"Bearer {tok}"})
        r = json.load(urllib.request.urlopen(req, timeout=8)).get("result") or []
        return {str(c): str(c) for c in r if str(c).isdigit() and len(str(c)) == 6}
    except Exception as e:
        tg.log(f"[night] watchlist 조회 실패(skip): {e}")
        return {}


def night_quote(code):
    """(정규장종가, 야간가, 등락%vs종가, 세션, 종목명) — 마감 상태 + 야간가 유효일 때만, 아니면 None.
    종목명은 네이버 stockName(권위) — watchlist 코드처럼 이름을 모르는 경우를 메운다."""
    try:
        b = _get_json(f"https://m.stock.naver.com/api/stock/{code}/basic")
    except Exception as e:
        tg.log(f"[night] {code} basic 실패: {e}")
        return None
    if str(b.get("marketStatus") or "") == "OPEN":
        return None  # 정규장 중엔 '전일 시간외 vs 당일 현재가' 혼동 → 비교 안 함
    om = b.get("overMarketPriceInfo") or {}
    if om.get("overMarketStatus") not in ("CLOSE", "TRADING"):
        return None
    close = _num(b.get("closePrice"))
    over = _num(om.get("overPrice"))
    if not close or not over or close <= 0 or over <= 0:
        return None
    pct = round((over / close - 1) * 100, 1)
    session = "프리마켓" if om.get("tradingSessionType") == "PRE_MARKET" else "애프터마켓"
    return close, over, pct, session, (b.get("stockName") or "").strip()


def main():
    tg.load_env()
    if not os.environ.get("TELEGRAM_BOT_TOKEN") or not os.environ.get("TELEGRAM_CHAT_ID"):
        tg.log("[night] 텔레그램 미설정 — skip")
        return
    today = datetime.now(KST).strftime("%Y%m%d")
    state = tg._load_state(STATE_PATH)

    codes = {}
    codes.update(watchlist_codes())
    codes.update(radar_codes())  # 레이더 이름 우선
    if not codes:
        tg.log("[night] 감시 대상 0종목 — skip")
        return

    alerted = 0
    for code, name in codes.items():
        key = f"{today}:{code}"
        if key in state:
            continue  # 같은 밤 1회만
        q = night_quote(code)
        if not q:
            continue
        close, over, pct, session, nm = q
        if pct > DROP_PCT:
            continue  # 급락 아님(임계 미달)
        label = nm or name  # 네이버 종목명 우선(watchlist 코드 이름 메움)
        msg = (f"🌙 NXT 야간 급락 경고\n"
               f"{label}({code}) {session}\n"
               f"정규장 {int(close):,}원 → 야간 {int(over):,}원 ({pct:+.1f}%)\n"
               f"익일 시초 갭 주의 (표시·경고용·매수추천 아님)")
        if tg.send(msg):
            state[key] = {"pct": pct, "close": close, "over": over,
                          "ts": datetime.now(KST).strftime("%Y-%m-%d %H:%M KST")}
            alerted += 1
            tg.log(f"[night] 경고 발송 {label}({code}) {pct:+.1f}%")
    if alerted:
        tg._save_state(STATE_PATH, state)
    tg.log(f"[night] 감시 {len(codes)}종목 · 경고 {alerted}건")


if __name__ == "__main__":
    main()
