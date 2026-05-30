#!/usr/bin/env python3
"""A-1 정확화 — 거래대금/상승률 상위 리스트 일별 스냅샷 수집기.

장 마감 후 매일 실행하면 data/ranks/YYYYMMDD.json 에 상위 종목을 누적 저장.
5거래일 누적되면 screener.py가 정확한 '5일내 상위 이력'을 사용할 수 있다.

사용: python3 scripts/snapshot_ranks.py [--n 40] [--date YYYYMMDD]
"""
import os
import sys
import json
import urllib.request

UA = {"User-Agent": "Mozilla/5.0", "Referer": "https://m.stock.naver.com/"}
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "ranks")


def _get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.load(r)


def fetch_rank(sort, market, n):
    url = f"https://m.stock.naver.com/api/stocks/{sort}/{market}?page=1&pageSize={n}"
    try:
        d = _get(url)
        return [{"name": s.get("stockName"), "code": s.get("itemCode")} for s in d.get("stocks", [])[:n]]
    except Exception as e:
        return [{"error": str(e)}]


def main():
    args = sys.argv[1:]
    n = int(args[args.index("--n") + 1]) if "--n" in args else 40
    date = args[args.index("--date") + 1] if "--date" in args else None

    snapshot = {
        "date": date or "latest",
        "transactionAmount": {  # 거래대금 상위
            "KOSPI": fetch_rank("transactionAmount", "KOSPI", n),
            "KOSDAQ": fetch_rank("transactionAmount", "KOSDAQ", n),
        },
        "up": {  # 상승률 상위
            "KOSPI": fetch_rank("up", "KOSPI", n),
            "KOSDAQ": fetch_rank("up", "KOSDAQ", n),
        },
    }

    os.makedirs(OUT_DIR, exist_ok=True)
    fname = os.path.join(OUT_DIR, f"{snapshot['date']}.json")
    with open(fname, "w", encoding="utf-8") as f:
        json.dump(snapshot, f, ensure_ascii=False, indent=2)

    # 요약
    codes = set()
    for cat in ("transactionAmount", "up"):
        for mkt in ("KOSPI", "KOSDAQ"):
            for x in snapshot[cat][mkt]:
                if x.get("code"):
                    codes.add(x["code"])
    print(f"저장: {fname} | 상위 종목 코드 {len(codes)}개")


if __name__ == "__main__":
    main()
