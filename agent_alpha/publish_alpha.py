"""웹 게시 — 최신 forward/{date}.json + calibration.json → web/data/alpha.json 생성 후 변경 시에만 git push.
agent_alpha가 web/에 쓰는 유일 지점(웹 표시용). flock으로 코어 publish와 git 직렬화. --dry-run = 미기록.
"""
import json
import os
import sys
import glob
import subprocess
import fcntl
import config

GIT_LOCK = "/tmp/stocknews_git.lock"   # 코어 publish.py와 공유(직렬화)

_MOVER_FIELDS = ("code", "name", "sector", "mover_type", "change_pct", "is_eumbong", "below_prev",
                 "turnover_pct", "turnover_2d_pct", "close_strength", "upper_wick_pct", "lower_wick_pct",
                 "spark_1430_count", "spark_source", "frgn_net", "orgn_net", "prsn_net",
                 "kiwoom_buy_concentration", "kiwoom_is_top_buyer", "glob_net_qty",
                 "kospi_chg", "kosdaq_chg", "catalyst", "real_likelihood", "sustainability",
                 "manipulation_risk", "prob_up", "confidence", "redteam_flag",
                 "labeled", "hit", "next_return_pct", "next_date")


def _latest_forward():
    files = sorted(glob.glob(os.path.join(config.FORWARD_DIR, "*.json")))
    if not files:
        return None, []
    fp = files[-1]
    try:
        day = json.load(open(fp, encoding="utf-8"))
    except Exception:
        return None, []
    rows = list(day.get("rows", {}).values())
    rows.sort(key=lambda r: (r.get("turnover_2d_pct") or 0), reverse=True)
    return day.get("date"), rows


def build_alpha():
    date, rows = _latest_forward()
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


def run(dry=False):
    data = build_alpha()
    payload = json.dumps(data, ensure_ascii=False, indent=1)
    if dry:
        print(f"[alpha-publish] DRY movers={len(data['movers'])} date={data['date']} (미기록)")
        print(payload[:600])
        return
    os.makedirs(os.path.dirname(config.ALPHA_JSON), exist_ok=True)
    # 변경 비교(generated_at 제외 — 매번 바뀌므로 movers/calibration만으로 판단)
    cmp_new = json.dumps({"movers": data["movers"], "calibration": data["calibration"]}, ensure_ascii=False)
    try:
        old = json.load(open(config.ALPHA_JSON, encoding="utf-8"))
        cmp_old = json.dumps({"movers": old.get("movers"), "calibration": old.get("calibration")}, ensure_ascii=False)
    except Exception:
        cmp_old = None
    tmp = config.ALPHA_JSON + ".tmp"
    open(tmp, "w", encoding="utf-8").write(payload)
    os.replace(tmp, config.ALPHA_JSON)
    if cmp_old == cmp_new:
        print("[alpha-publish] 변경 없음 — push 생략")
        return
    # git add/commit/push (flock으로 코어 publish와 직렬화)
    with open(GIT_LOCK, "w") as lk:
        try:
            fcntl.flock(lk, fcntl.LOCK_EX)
        except Exception:
            pass
        try:
            subprocess.run(["git", "add", "web/data/alpha.json"], cwd=config.REPO, check=True)
            subprocess.run(["git", "commit", "-m", f"data(alpha): {data['date']} movers {len(data['movers'])}"],
                           cwd=config.REPO, check=True)
            subprocess.run(["git", "pull", "--rebase", "origin", "main"], cwd=config.REPO, check=False)
            subprocess.run(["git", "push", "origin", "main"], cwd=config.REPO, check=False)
            print(f"[alpha-publish] alpha.json push (movers {len(data['movers'])})")
        except subprocess.CalledProcessError as e:
            print(f"[alpha-publish] git 실패(무시): {e}")


if __name__ == "__main__":
    run(dry="--dry-run" in sys.argv)
