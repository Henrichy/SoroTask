# Health Check Sidecar

A lightweight shell sidecar that polls the keeper's `/health` endpoint and triggers a restart after a configurable number of consecutive failures. This prevents flapping (single transient errors don't cause restarts) while ensuring the keeper recovers from genuine outages.

## How It Works

```
[sidecar] --poll every POLL_INTERVAL_S--> [keeper /health]
              ↓ HTTP 200          → reset failure counter, log INFO
              ↓ non-200 / timeout → increment counter, log WARN
              ↓ counter >= FAILURE_THRESHOLD → execute RESTART_CMD, log CRITICAL
```

## Files

| File | Purpose |
|---|---|
| `keeper/health-check-sidecar.sh` | The sidecar script |
| `docker-compose.yml` | Updated to include the `keeper-sidecar` service |

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `HEALTH_URL` | `http://localhost:3000/health` | Full URL of the health endpoint to poll |
| `POLL_INTERVAL_S` | `15` | Seconds between each poll |
| `FAILURE_THRESHOLD` | `3` | Consecutive failures before a restart is triggered |
| `RESTART_CMD` | `kill -SIGTERM 1` | Shell command executed to restart the keeper |

In `docker-compose.yml` the sidecar-specific variables are also exposed at the Compose level:

| Compose variable | Maps to | Default |
|---|---|---|
| `SIDECAR_POLL_INTERVAL_S` | `POLL_INTERVAL_S` | `15` |
| `SIDECAR_FAILURE_THRESHOLD` | `FAILURE_THRESHOLD` | `3` |

## Deployment

### Docker Compose (recommended)

```bash
# Optional overrides in your shell or a .env file at the repo root
export SIDECAR_POLL_INTERVAL_S=20
export SIDECAR_FAILURE_THRESHOLD=5

docker compose up -d
```

The sidecar runs as a separate container (`keeper-sidecar`) that shares the Docker network with `keeper`. When the threshold is reached it signals the keeper container to restart via the configured `RESTART_CMD`.

### Standalone (non-Docker)

```bash
chmod +x keeper/health-check-sidecar.sh

# Run against a local keeper process; restart via supervisorctl
HEALTH_URL=http://localhost:3000/health \
POLL_INTERVAL_S=15 \
FAILURE_THRESHOLD=3 \
RESTART_CMD="supervisorctl restart keeper" \
  ./keeper/health-check-sidecar.sh
```

### Systemd unit (optional)

```ini
[Unit]
Description=SoroTask Keeper Health-Check Sidecar
After=network.target

[Service]
EnvironmentFile=/etc/sorotask/sidecar.env
ExecStart=/opt/sorotask/keeper/health-check-sidecar.sh
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

## Log Format

All output goes to stdout in a structured, grep-friendly format:

```
[2026-03-29T01:42:00Z] [INFO]     Health check passed (HTTP 200)
[2026-03-29T01:42:15Z] [WARN]     Health check failed (HTTP 503, curl exit 0) — consecutive failures: 1/3
[2026-03-29T01:42:30Z] [WARN]     Health check failed (HTTP 000, curl exit 28) — consecutive failures: 2/3
[2026-03-29T01:42:45Z] [CRITICAL] Failure threshold reached. Triggering restart: supervisorctl restart keeper
```

`curl exit 28` = timeout; `HTTP 000` = no response received.

## Customising the Restart Command

| Environment | `RESTART_CMD` |
|---|---|
| Docker (signal PID 1) | `kill -SIGTERM 1` *(default)* |
| Supervisord | `supervisorctl restart keeper` |
| Systemd | `systemctl restart sorotask-keeper` |
| Kubernetes | Not needed — use liveness probes instead |
