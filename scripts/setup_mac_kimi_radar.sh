#!/usr/bin/env bash
# Mac production setup for radar + Kimi verification.
#
# Run this on the Mac that owns cron:
#   bash scripts/setup_mac_kimi_radar.sh
#
# What it does:
# - sync latest main
# - ensure MOONSHOT_* exists locally for Mac cron
# - set timezone/cron via setup_mac_autorun.sh
# - run a safe radar dry-run with Kimi disabled to verify the pipeline
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
WEB_ENV="$REPO/web/.env.local"

cd "$REPO"

echo "== stocknews Mac Kimi radar setup =="
echo "repo: $REPO"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "ERROR: $1 command not found" >&2
    exit 1
  fi
}

require_cmd git
require_cmd python3

stash_dirty_worktree() {
  if [ -n "$(git status --porcelain)" ]; then
    echo "Local git changes found. Stashing them before sync."
    git status --short
    git stash push -u -m "setup_mac_kimi_radar auto-stash $(date +%Y%m%d%H%M%S)"
    echo "Local changes were preserved in git stash."
  fi
}

env_has_key() {
  local key="$1"
  [ -n "${!key:-}" ] && return 0
  [ -f "$REPO/.env" ] && grep -qE "^${key}=" "$REPO/.env" && return 0
  [ -f "$WEB_ENV" ] && grep -qE "^${key}=" "$WEB_ENV" && return 0
  return 1
}

append_or_replace_env() {
  local key="$1"
  local value="$2"
  mkdir -p "$(dirname "$WEB_ENV")"
  touch "$WEB_ENV"
  if grep -qE "^${key}=" "$WEB_ENV"; then
    local tmp
    tmp="$(mktemp)"
    awk -v k="$key" -v v="$value" 'BEGIN{FS=OFS="="} $1==k {$0=k"="v} {print}' "$WEB_ENV" > "$tmp"
    mv "$tmp" "$WEB_ENV"
  else
    printf '%s=%s\n' "$key" "$value" >> "$WEB_ENV"
  fi
}

echo
echo "== sync main =="
stash_dirty_worktree
git fetch origin main
git pull --ff-only origin main

echo
echo "== Kimi local env =="
if env_has_key "MOONSHOT_API_KEY"; then
  echo "MOONSHOT_API_KEY: already configured locally"
else
  echo "MOONSHOT_API_KEY is required on this Mac because cron calls Kimi locally."
  printf "Paste MOONSHOT_API_KEY (input hidden): "
  stty -echo
  read -r MOONSHOT_KEY
  stty echo
  printf '\n'
  if [ -z "$MOONSHOT_KEY" ]; then
    echo "ERROR: MOONSHOT_API_KEY was empty" >&2
    exit 1
  fi
  append_or_replace_env "MOONSHOT_API_KEY" "$MOONSHOT_KEY"
  echo "MOONSHOT_API_KEY: saved to web/.env.local"
fi

if ! env_has_key "MOONSHOT_BASE_URL"; then
  append_or_replace_env "MOONSHOT_BASE_URL" "https://api.moonshot.ai/v1"
  echo "MOONSHOT_BASE_URL: added default"
else
  echo "MOONSHOT_BASE_URL: already configured"
fi

if ! env_has_key "MOONSHOT_MODEL"; then
  append_or_replace_env "MOONSHOT_MODEL" "kimi-k2.6"
  echo "MOONSHOT_MODEL: added default kimi-k2.6"
else
  echo "MOONSHOT_MODEL: already configured"
fi

echo
echo "== install Mac autorun =="
bash scripts/setup_mac_autorun.sh

echo
echo "== verify radar pipeline =="
RADAR_KIMI_VERIFY=0 python3 scripts/publish.py --dry-run --max 3

echo
echo "== current cron =="
crontab -l | grep -E "scripts/publish.py|scripts/radar_backtest.py|analyzer/run.py|analyzer/backtest.py" || {
  echo "ERROR: project cron lines not found" >&2
  exit 1
}

echo
echo "Setup complete."
echo "Kimi radar verification runs only during 14:45~15:30 KST when candidates exist."
echo "Logs:"
echo "  tail -f /tmp/publish.log"
echo "  tail -f /tmp/radar_backtest.log"
