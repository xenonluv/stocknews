"""웹 게시 — 최근 forward(라벨된 익일결과 포함) + calibration → web/data/alpha.json, 변경 시에만 git push.
agent_alpha가 web/에 쓰는 유일 지점. flock으로 코어 publish와 git 직렬화. --dry-run = 미기록.
"""
import json
import os
import sys
import glob
import subprocess
import fcntl
import config

GIT_LOCK = "/tmp/stocknews_git.lock"   # 코어 publish.py와 공유(직렬화)
RECENT_DAYS = 3                         # 라벨된 익일결과가 보이도록 최근 N개 forward 파일 합침

_MOVER_FIELDS = ("code", "name", "sector", "mover_type", "date", "change_pct", "is_eumbong", "below_prev",
                 "turnover_pct", "turnover_2d_pct", "close_strength", "upper_wick_pct", "lower_wick_pct",
                 "spark_1430_count", "spark_source", "frgn_net", "orgn_net", "prsn_net",
                 "kiwoom_buy_concentration", "kiwoom_is_top_buyer", "glob_net_qty",
                 "kospi_chg", "kosdaq_chg", "catalyst", "real_likelihood", "sustainability",
                 "manipulation_risk", "prob_up", "confidence", "redteam_flag",
                 "labeled", "hit", "next_return_pct", "next_date")


def _recent_forward(n=RECENT_DAYS):
    """최근 n개 forward 파일의 행을 합쳐 코드별 최신(date max)만 — 오늘 미라벨 + 어제 라벨(익일결과) 동시 노출."""
    files = sorted(glob.glob(os.path.join(config.FORWARD_DIR, "*.json")))[-n:]
    if not files:
        return None, []
    by_code = {}
    latest = None
    for fp in files:
        try:
            day = json.load(open(fp, encoding="utf-8"))
        except Exception:
            continue
        latest = day.get("date") or latest
        for code, r in (day.get("rows") or {}).items():
            cur = by_code.get(code)
            if cur is None or (r.get("date") or "") >= (cur.get("date") or ""):
                by_code[code] = r
    rows = sorted(by_code.values(),
                  key=lambda r: ((r.get("date") or ""), (r.get("turnover_2d_pct") or 0)), reverse=True)
    return latest, rows


def build_alpha():
    date, rows = _recent_forward()
    movers = [{k: r.get(k) for k in _MOVER_FIELDS} for r in rows]
    try:
        calib = json.load(open(config.CALIBRATION, encoding="utf-8"))
    except Exception:
        calib = None
    return {
        "generated_at": config.now_iso(),
        "date": date,
        "movers": movers,
        "calibration": calib,
        "disclaimer": ("측정·실험용 — 매수 추천이 아닙니다. 스파크/거래원은 약신호(창구≠주체)이며, "
                       "전진검증 표본이 충분(min_n)할 때까지 calibration은 '관찰중'입니다."),
    }


def _cmp_key(data):
    """변경 판정용 — 매번 바뀌는 타임스탬프(top-level + 중첩 calibration.generated_at) 제외."""
    calib = data.get("calibration")
    if isinstance(calib, dict):
        calib = {k: v for k, v in calib.items() if k != "generated_at"}
    return json.dumps({"movers": data.get("movers"), "calibration": calib}, ensure_ascii=False, sort_keys=True)


def run(dry=False):
    data = build_alpha()
    if dry:
        print(f"[alpha-publish] DRY movers={len(data['movers'])} date={data['date']} (미기록)")
        print(json.dumps(data, ensure_ascii=False, indent=1)[:600])
        return
    os.makedirs(os.path.dirname(config.ALPHA_JSON), exist_ok=True)
    new_key = _cmp_key(data)
    try:
        old = json.load(open(config.ALPHA_JSON, encoding="utf-8"))
        old_key = _cmp_key(old)
    except Exception:
        old_key = None
    if old_key == new_key:
        print("[alpha-publish] 변경 없음 — 비기록·push 생략")   # 무변경 시 파일도 안 건드림(working tree 청결)
        return
    tmp = config.ALPHA_JSON + ".tmp"
    open(tmp, "w", encoding="utf-8").write(json.dumps(data, ensure_ascii=False, indent=1))
    os.replace(tmp, config.ALPHA_JSON)
    with open(GIT_LOCK, "w") as lk:
        try:
            fcntl.flock(lk, fcntl.LOCK_EX)
        except Exception:
            pass
        try:
            subprocess.run(["git", "add", "web/data/alpha.json"], cwd=config.REPO, check=True)
            subprocess.run(["git", "commit", "-m", f"data(alpha): {data['date']} movers {len(data['movers'])}"],
                           cwd=config.REPO, check=True)
        except subprocess.CalledProcessError as e:
            print(f"[alpha-publish] commit 실패(무시): {e}")
            return
        for attempt in range(2):
            subprocess.run(["git", "pull", "--rebase", "--autostash", "origin", "main"], cwd=config.REPO, check=False)
            if subprocess.run(["git", "push", "origin", "main"], cwd=config.REPO).returncode == 0:
                print(f"[alpha-publish] alpha.json push (movers {len(data['movers'])})")
                return
        subprocess.run(["git", "rebase", "--abort"], cwd=config.REPO, check=False)
        print("[alpha-publish] push 실패(2회) — 다음 회차 재시도")


if __name__ == "__main__":
    run(dry="--dry-run" in sys.argv)
