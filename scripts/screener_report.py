#!/usr/bin/env python3
"""스크리너 JSON → 마크다운 리포트 (뉴스 링크 포함).

사용: python3 scripts/screener.py ... > out.json
      python3 scripts/screener_report.py out.json
"""
import sys
import json


def fmt_news(news):
    lines = []
    for n in (news or [])[:4]:
        t = n.get("title", "").rstrip(". ")
        u = n.get("url")
        o = n.get("office", "")
        s = n.get("sentiment", "")
        tag = {"호재": "🔴", "악재": "🔵", "혼재": "🟡"}.get(s, "")
        lines.append(f"  - {tag}[{t}]({u}) — {o}" if u else f"  - {tag}{t} — {o}")
    return "\n".join(lines) if lines else "  - (관련 재료 뉴스 없음)"


def fmt_stock(r):
    a = r.get("A", {})
    c = r.get("C", {})
    setup = f"거래량 {a.get('vol_x')}배 · {a.get('gain')}% ({a.get('date')})"
    chart = (f"3분봉 정배열={c.get('aligned')} · GC최근={c.get('gc_recent')}"
             f"(교차 {c.get('cross_ago_bars')}봉전) · 이격도 {c.get('disparity_pct')}%")
    material = f"중요도 {r.get('importance')}/10 ({r.get('impact')}) · 종합 {r.get('sentiment')}"
    return (f"### {r['name']} ({r['code']}) · {r['sector']}\n"
            f"- A(이력): {setup}\n- C(차트): {chart}\n"
            f"- B(재료): {material} · 관련 뉴스 {r.get('B_news')}건\n"
            f"{fmt_news(r.get('news'))}\n")


def main():
    d = json.load(open(sys.argv[1], encoding="utf-8"))
    th = d["thresholds"]
    print(f"# 스크리너 리포트 (유니버스 {d['universe_size']} · ETF/우선주 제외)")
    print(f"_임계값: 거래량x{th['vol_x']} 상승{th['gain']}% / 뉴스>={th['news_min']} / "
          f"GC최근{th['gc_window']}봉 이격도<={th['disp_max']}%_\n")

    print(f"## ✅ 통과 ({len(d['passed'])})\n")
    for r in d["passed"]:
        print(fmt_stock(r))

    # 후보: 근접/차트미달 중 이격도 작은 순(=교차 임박/안정) 상위
    cands = []
    for recs in d["by_sector"].values():
        for r in recs:
            if r.get("tier", "").startswith(("근접", "A통과")):
                disp = (r.get("C") or {}).get("disparity_pct")
                cands.append((abs(disp) if isinstance(disp, (int, float)) else 999, r))
    cands.sort(key=lambda x: x[0])
    print(f"\n## 📂 후보 (탈락했지만 주목 — 이격도 작은 순 상위 8)\n")
    for _, r in cands[:8]:
        print(fmt_stock(r))


if __name__ == "__main__":
    main()
