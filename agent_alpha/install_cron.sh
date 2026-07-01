#!/usr/bin/env bash
# agent_alpha 자체 cron (네임스페이스 — 기존 코어 cron 무수정).
#   설치: bash agent_alpha/install_cron.sh
#   미리보기: bash agent_alpha/install_cron.sh --dry-run
#   제거: bash agent_alpha/install_cron.sh --uninstall   (블록만 삭제, 코어 cron 무손상)
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
PY="$(command -v python3 || echo /usr/bin/python3)"
BEGIN="# AGENT_ALPHA_BEGIN"
END="# AGENT_ALPHA_END"

BLOCK="$BEGIN
# 장중 LLM 루프(재료·찌라시·조작 판단 → judgments). 10분 간격.
1,11,21,31,41,51 9-15 * * 1-5 cd $REPO && $PY agent_alpha/loop.py >> /tmp/agent_alpha_loop.log 2>&1
# 전진수집 2회 — 15:10 장중 잠정(회장님 15:30 종가베팅 전 표시용·provisional, 15:15 게시가 수집 완료 후 돌도록 5분 선행) + 15:40 마감후 확정(정본·익일라벨 기준).
10,40 15 * * 1-5 cd $REPO && $PY agent_alpha/collect.py >> /tmp/agent_alpha_collect.log 2>&1
# 익일 라벨 — 마감 후 16:00(그날 일봉 완성 즉시 전일 신호 익일결과 라벨, 화요일까지 안 기다림) + 09:10 안전망(16시 누락분).
0 16 * * 1-5 cd $REPO && $PY agent_alpha/label.py >> /tmp/agent_alpha_label.log 2>&1
10 9 * * 1-5 cd $REPO && $PY agent_alpha/label.py >> /tmp/agent_alpha_label.log 2>&1
# 채점·보정(장후)
45 17 * * 1-5 cd $REPO && $PY agent_alpha/calibrate.py >> /tmp/agent_alpha_calibrate.log 2>&1
# 웹 /alpha 게시 2회 — 15:15 잠정(15:10 수집 직후, 15:30 종가베팅 전 매수판단 15분 확보) + 15:43 확정(15:40 수집 직후). 변경 시에만 push.
15,43 15 * * 1-5 cd $REPO && $PY agent_alpha/publish_alpha.py >> /tmp/agent_alpha_publish.log 2>&1
# 웹 /alpha 2차 게시(보정 후 — 당일 calibration 반영)
47 17 * * 1-5 cd $REPO && $PY agent_alpha/publish_alpha.py >> /tmp/agent_alpha_publish.log 2>&1
$END"

# 기존 블록 제거
EXISTING="$(crontab -l 2>/dev/null | sed "/$BEGIN/,/$END/d" || true)"

if [ "${1:-}" = "--uninstall" ]; then
  printf '%s\n' "$EXISTING" | crontab -
  echo "✅ agent_alpha cron 제거됨(코어 cron 무손상)."
  exit 0
fi

NEW="$EXISTING
$BLOCK"

if [ "${1:-}" = "--dry-run" ]; then
  echo "── 설치 예정 블록 ──"; echo "$BLOCK"
  exit 0
fi

printf '%s\n' "$NEW" | crontab -
echo "✅ agent_alpha cron 설치 완료 (repo=$REPO)"
echo "── 설치된 agent_alpha 잡 ──"
crontab -l | sed -n "/$BEGIN/,/$END/p"
echo "  ℹ️ 로그: /tmp/agent_alpha_*.log  ·  제거: bash agent_alpha/install_cron.sh --uninstall"
