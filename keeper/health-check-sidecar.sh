#!/usr/bin/env sh
# health-check-sidecar.sh
#
# Polls the keeper's /health endpoint and restarts the service after a
# configurable number of consecutive failures. Designed to run as a sidecar
# container alongside the keeper.
#
# Environment variables (all optional):
#   HEALTH_URL              Full URL to poll          (default: http://localhost:3000/health)
#   POLL_INTERVAL_S         Seconds between polls     (default: 15)
#   FAILURE_THRESHOLD       Failures before restart   (default: 3)
#   RESTART_CMD             Command to restart keeper (default: kill -SIGTERM 1)

HEALTH_URL="${HEALTH_URL:-http://localhost:3000/health}"
POLL_INTERVAL_S="${POLL_INTERVAL_S:-15}"
FAILURE_THRESHOLD="${FAILURE_THRESHOLD:-3}"
RESTART_CMD="${RESTART_CMD:-kill -SIGTERM 1}"

consecutive_failures=0

log() {
  level="$1"; shift
  printf '[%s] [%s] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$level" "$*"
}

log INFO "Sidecar started. Polling ${HEALTH_URL} every ${POLL_INTERVAL_S}s (threshold: ${FAILURE_THRESHOLD})"

while true; do
  # -sf: silent + follow redirects; --max-time: network timeout guard
  http_code=$(curl -sf --max-time 5 -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null)
  exit_code=$?

  if [ "$exit_code" -eq 0 ] && [ "$http_code" -eq 200 ]; then
    consecutive_failures=0
    log INFO "Health check passed (HTTP ${http_code})"
  else
    consecutive_failures=$((consecutive_failures + 1))
    log WARN "Health check failed (HTTP ${http_code}, curl exit ${exit_code}) — consecutive failures: ${consecutive_failures}/${FAILURE_THRESHOLD}"

    if [ "$consecutive_failures" -ge "$FAILURE_THRESHOLD" ]; then
      log CRITICAL "Failure threshold reached. Triggering restart: ${RESTART_CMD}"
      eval "$RESTART_CMD"
      consecutive_failures=0
    fi
  fi

  sleep "$POLL_INTERVAL_S"
done
