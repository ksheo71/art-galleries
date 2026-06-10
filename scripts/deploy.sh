#!/usr/bin/env bash
# art-galleries 운영 배포 스크립트 (pdfsnap deploy.sh 의 정적 사이트 버전)
#
# 위치: /opt/stack/services/public/art-galleries.kr/www/repo/scripts/deploy.sh
#   (GitHub clone 의 일부 — 자기 자신도 git pull 로 갱신된다)
#
# 호출 경로:
#   - GitHub Actions (.github/workflows/deploy.yml) 가 main push 시 self-hosted runner 에서 실행
#   - 운영자가 맥미니에서 직접 실행해도 동일하게 동작
#
# 동작:
#   1. origin/main 강제 동기화 (운영 트리는 read-only 전제)
#   2. docker compose up -d (nginx + apps/ 바인드 마운트 — 빌드 불필요, 새 파일 즉시 반영)
#   3. dangling 이미지 정리
#   4. /healthz 헬스체크 — 실패 시 비-0 종료
set -euo pipefail

DEPLOY_ROOT="/opt/stack/services/public/art-galleries.kr/www"
REPO_DIR="$DEPLOY_ROOT/repo"
COMPOSE_FILE="$REPO_DIR/docker-compose.yml"
ENV_FILE="$DEPLOY_ROOT/.env"   # HARVARD_API_KEY 등 비밀(레포에 없음, 운영 트리에만)
CONTAINER="art-galleries-frontend"

log()  { printf '\033[1;34m[deploy]\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[deploy:FAIL]\033[0m %s\n' "$*" >&2; exit 1; }

[ -d "$REPO_DIR/.git" ]  || fail "repo not found at $REPO_DIR (git clone 필요)"
[ -f "$COMPOSE_FILE" ]   || fail "docker-compose.yml not found at $COMPOSE_FILE"

cd "$REPO_DIR"

log "fetching origin/main"
git fetch --prune origin
BEFORE_SHA=$(git rev-parse --short HEAD || echo "none")
git reset --hard origin/main
AFTER_SHA=$(git rev-parse --short HEAD)
log "HEAD: $BEFORE_SHA → $AFTER_SHA"

# .env(비밀) 가 있으면 compose 에 주입. 없으면 키 프록시는 비활성(프론트는 정상 동작).
ENV_ARGS=()
if [ -f "$ENV_FILE" ]; then
  ENV_ARGS=(--env-file "$ENV_FILE")
  log "using env file $ENV_FILE"
else
  log "no .env at $ENV_FILE — 키 프록시는 키 없이 기동(Harvard 비활성)"
fi

log "docker compose up -d --build (proxy 이미지 빌드 포함)"
docker compose "${ENV_ARGS[@]}" -f "$COMPOSE_FILE" up -d --build --remove-orphans

# 바인드 마운트된 nginx.conf 변경은 컨테이너 스펙이 동일하면 compose up 만으로 반영되지 않는다
# (nginx 프로세스가 옛 설정을 유지). 실행 중인 컨테이너에 설정 리로드를 보내 새 nginx.conf 반영.
if docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  log "reloading nginx config"
  docker exec "$CONTAINER" nginx -s reload 2>/dev/null || log "nginx reload skipped (방금 재생성됨)"
fi

log "pruning dangling images"
docker image prune -f >/dev/null

log "waiting for $CONTAINER /healthz (max 60s)"
for i in $(seq 1 30); do
  if docker exec "$CONTAINER" wget -qO- --timeout=2 http://127.0.0.1:3100/healthz 2>/dev/null | grep -qx "ok"; then
    log "healthy at attempt $i"
    log "deploy OK ($AFTER_SHA)"
    exit 0
  fi
  sleep 2
done

fail "/healthz did not respond OK within 60s — docker logs $CONTAINER 확인"
