#!/usr/bin/env python3
"""이벤트 캘린더 — D-10 이내 매크로/실적 이벤트 (조건 1).

소스:
  1. data/macro_events.json — 정적 일정 (FOMC/CPI/금통위 등, 연 1회 수동 갱신)
  2. 규칙 생성 — 한국 옵션·선물 만기일(매월 둘째 목요일), 미국 고용보고서(매월 첫 금요일)

크롤링 의존 없음 (안 깨짐). 캘린더에 D-N 이벤트가 0개면 stderr 경고(갱신 누락 알림).

사용:
  python3 scripts/event_calendar.py            # D-10 이벤트 출력
  from event_calendar import upcoming_events
"""
import os
import sys
import json
from datetime import date, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC_PATH = os.path.join(ROOT, "data", "macro_events.json")


def _nth_weekday(year, month, weekday, nth):
    """해당 월의 n번째 weekday(월=0) 날짜."""
    d = date(year, month, 1)
    offset = (weekday - d.weekday()) % 7
    return d + timedelta(days=offset + 7 * (nth - 1))


def _rule_events(start, end):
    """규칙 기반 이벤트 생성 (start~end 범위)."""
    out = []
    y, m = start.year, start.month
    months = set()
    cur = date(y, m, 1)
    while cur <= end:
        months.add((cur.year, cur.month))
        cur = (cur.replace(day=28) + timedelta(days=4)).replace(day=1)
    for yy, mm in sorted(months):
        expiry = _nth_weekday(yy, mm, 3, 2)  # 둘째 목요일
        out.append({"date": expiry.isoformat(), "title": f"한국 옵션·선물 동시만기일 ({mm}월)",
                    "category": ["수급"], "importance": 6, "country": "KR", "estimated": False})
        jobs = _nth_weekday(yy, mm, 4, 1)  # 첫째 금요일
        out.append({"date": jobs.isoformat(), "title": f"미국 고용보고서 ({mm}월 발표)",
                    "category": ["금리", "환율"], "importance": 8, "country": "US",
                    "estimated": True})
    return out


def upcoming_events(days=10, today=None):
    """오늘부터 days일 이내 이벤트 목록 (dday 오름차순)."""
    today = today or date.today()
    end = today + timedelta(days=days)
    events = []
    try:
        static = json.load(open(STATIC_PATH, encoding="utf-8")).get("events", [])
    except Exception as e:
        print(f"[warn] macro_events.json 로드 실패: {e}", file=sys.stderr)
        static = []
    for ev in static + _rule_events(today, end):
        try:
            d = date.fromisoformat(ev["date"])
        except (KeyError, ValueError):
            continue
        if today <= d <= end:
            dday = (d - today).days
            events.append({
                "id": f"{ev['date']}_{ev['title'][:12]}",
                "date": ev["date"],
                "dday": dday,
                "title": ev["title"],
                "category": ev.get("category", []),
                "importance": ev.get("importance", 5),
                "country": ev.get("country", ""),
                "estimated": bool(ev.get("estimated")),
            })
    # 같은 날짜·제목 중복 제거 후 dday → importance 순 정렬
    uniq = {}
    for ev in events:
        uniq.setdefault(ev["id"], ev)
    out = sorted(uniq.values(), key=lambda e: (e["dday"], -e["importance"]))
    if not out:
        print(f"[warn] D-{days} 이벤트 0건 — data/macro_events.json 갱신 누락 가능",
              file=sys.stderr)
    return out


if __name__ == "__main__":
    days = int(sys.argv[1]) if len(sys.argv) > 1 else 10
    print(json.dumps(upcoming_events(days), ensure_ascii=False, indent=1))
