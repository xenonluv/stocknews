#!/usr/bin/env python3
"""네트워크 헬퍼 — 정중한 요청 간격 + 재시도/지수백오프.

24h 무인 운영 시 네이버 레이트리밋·일시 오류로부터 보호.
모든 수집 함수가 이 헬퍼를 거치게 해 요청 간 최소 간격을 강제한다.
"""
import time
import urllib.request
import urllib.error

MIN_GAP = 0.15          # 요청 간 최소 간격(초) — 과도한 연속 호출 방지
_last = [0.0]           # 프로세스 전역 마지막 호출 시각(monotonic)
RETRYABLE = {429, 403, 500, 502, 503, 504}


def _throttle():
    gap = time.monotonic() - _last[0]
    if gap < MIN_GAP:
        time.sleep(MIN_GAP - gap)
    _last[0] = time.monotonic()


def get_bytes(url, headers=None, timeout=15, retries=3):
    """URL → bytes. 레이트리밋/일시오류 시 지수백오프 재시도."""
    headers = headers or {"User-Agent": "Mozilla/5.0"}
    err = None
    for attempt in range(retries):
        _throttle()
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            err = e
            if e.code in RETRYABLE:
                time.sleep(min(8.0, 0.6 * (2 ** attempt)))
                continue
            raise
        except Exception as e:  # URLError, timeout 등
            err = e
            time.sleep(min(8.0, 0.6 * (2 ** attempt)))
            continue
    raise err


def get_text(url, headers=None, timeout=15, retries=3, encodings=("utf-8",)):
    """URL → str. encodings 순서로 디코드 시도(마지막은 ignore)."""
    raw = get_bytes(url, headers, timeout, retries)
    for enc in encodings:
        try:
            return raw.decode(enc)
        except Exception:
            continue
    return raw.decode("utf-8", "ignore")
