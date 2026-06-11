#!/bin/bash
# 전국 전시 야간 배치 — 운영 트리에서 harvest 실행 → apps/exhibitions/data/exhibitions.json 갱신.
# launchd(com.art-galleries.exhibitions)가 매일 새벽 호출한다. 키는 운영 .env 에서만 읽는다.
set -euo pipefail

DEPLOY_ROOT="/opt/stack/services/public/art-galleries.kr/www"
REPO_DIR="$DEPLOY_ROOT/repo"
ENV_FILE="$DEPLOY_ROOT/.env"
NODE="/Users/kyle/.local/bin/node"
LOG="$DEPLOY_ROOT/exhibitions-batch.log"

{
  echo "=== $(date '+%Y-%m-%d %H:%M:%S') exhibitions batch 시작 ==="
  if [ ! -f "$ENV_FILE" ]; then echo "ERROR: .env 없음 ($ENV_FILE)"; exit 1; fi
  EXHIBITIONS_API_KEY="$(grep -E '^EXHIBITIONS_API_KEY=' "$ENV_FILE" | head -1 | cut -d= -f2-)"
  if [ -z "${EXHIBITIONS_API_KEY:-}" ]; then echo "ERROR: EXHIBITIONS_API_KEY 미설정"; exit 1; fi
  export EXHIBITIONS_API_KEY
  # 서울 열린데이터광장 키(선택) — 있으면 서울 전시 병합
  SEOUL_API_KEY="$(grep -E '^SEOUL_API_KEY=' "$ENV_FILE" | head -1 | cut -d= -f2-)"
  export SEOUL_API_KEY
  cd "$REPO_DIR"
  "$NODE" apps/exhibitions/scripts/harvest.mjs
  echo "=== $(date '+%Y-%m-%d %H:%M:%S') 완료 ==="
} >> "$LOG" 2>&1
