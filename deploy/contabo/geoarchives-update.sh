#!/usr/bin/env bash

set -Eeuo pipefail

APP_DIR="${GEOARCHIVES_APP_DIR:-/var/www/gis-carto}"
REMOTE="${GEOARCHIVES_DEPLOY_REMOTE:-origin}"
BRANCH="${GEOARCHIVES_DEPLOY_BRANCH:-codex/fix-low-connectivity-form}"
SERVICE="${GEOARCHIVES_SERVICE_NAME:-geoarchives-api}"
HEALTH_URL="${GEOARCHIVES_HEALTH_URL:-http://127.0.0.1:4201/api/users}"
STATE_DIR="${GEOARCHIVES_DEPLOY_STATE_DIR:-/var/lib/geoarchives-update}"
STATE_FILE="${STATE_DIR}/deployed-commit"

log() {
  printf '[geoarchives-update] %s\n' "$*"
}

fail() {
  log "ERREUR: $*"
  exit 1
}

health_is_ok() {
  local status

  status="$(curl --silent --show-error --output /dev/null \
    --write-out '%{http_code}' --max-time 5 "$HEALTH_URL" || true)"

  case "$status" in
    200|401|403) return 0 ;;
    *) return 1 ;;
  esac
}

wait_for_health() {
  local attempt

  for attempt in $(seq 1 30); do
    if health_is_ok; then
      return 0
    fi
    sleep 1
  done

  return 1
}

if [[ "${EUID}" -ne 0 ]]; then
  fail "ce script doit etre execute par root"
fi

for command in git npm systemctl curl; do
  command -v "$command" >/dev/null 2>&1 || fail "commande introuvable: $command"
done

[[ -d "${APP_DIR}/.git" ]] || fail "depot Git introuvable: ${APP_DIR}"
cd "$APP_DIR"

current_branch="$(git branch --show-current)"
[[ "$current_branch" == "$BRANCH" ]] || \
  fail "branche active '${current_branch}', branche attendue '${BRANCH}'"

if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  fail "le depot contient des modifications suivies; aucun deploiement automatique"
fi

log "verification de ${REMOTE}/${BRANCH}"
git fetch --prune "$REMOTE" "$BRANCH"

remote_ref="refs/remotes/${REMOTE}/${BRANCH}"
git show-ref --verify --quiet "$remote_ref" || fail "reference distante introuvable: ${remote_ref}"

current_commit="$(git rev-parse HEAD)"
target_commit="$(git rev-parse "$remote_ref")"
deployed_commit=""

if [[ -f "$STATE_FILE" ]]; then
  deployed_commit="$(tr -d '[:space:]' < "$STATE_FILE")"
fi

install -d -m 0750 "$STATE_DIR"

# Premiere execution sur un serveur deja a jour et sain: memoriser l'etat sans
# reconstruire ni interrompre le service actuellement en production.
if [[ -z "$deployed_commit" && "$current_commit" == "$target_commit" ]] && health_is_ok; then
  printf '%s\n' "$target_commit" > "${STATE_FILE}.tmp"
  mv "${STATE_FILE}.tmp" "$STATE_FILE"
  log "etat initial enregistre: ${target_commit}"
  exit 0
fi

if [[ "$deployed_commit" == "$target_commit" ]] && health_is_ok; then
  log "aucune mise a jour: ${target_commit} est deja deploye"
  exit 0
fi

if [[ "$current_commit" != "$target_commit" ]]; then
  git merge-base --is-ancestor "$current_commit" "$target_commit" || \
    fail "mise a jour non lineaire refusee; intervention manuelle requise"

  log "mise a jour du code vers ${target_commit}"
  git merge --ff-only "$remote_ref"
fi

log "installation des dependances"
npm ci --include=dev

log "construction de l'application"
npm run build:contabo

log "redemarrage de ${SERVICE}"
systemctl restart "$SERVICE"

if ! wait_for_health; then
  fail "le controle de sante a echoue sur ${HEALTH_URL}"
fi

printf '%s\n' "$target_commit" > "${STATE_FILE}.tmp"
mv "${STATE_FILE}.tmp" "$STATE_FILE"
log "deploiement termine: ${target_commit}"
