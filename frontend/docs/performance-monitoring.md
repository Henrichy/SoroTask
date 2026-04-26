# Frontend Performance Monitoring

This frontend captures lightweight metrics for core interaction paths so regressions can be identified early.

## Captured Metrics

| Metric | Meaning | Trigger |
| :--- | :--- | :--- |
| `route_load_ms` | Time from page bootstrap to first painted frame of the route | Initial render of `/` |
| `task_open_ms` | Time between clicking a task row and task detail state being visible | Opening a task from execution logs |
| `search_latency_ms` | Time from search input change to filtered results rendering | Searching logs |
| `mutation_register_task_ms` | End-to-end client timing for task registration mutation path | Clicking `Register Task` |

## Sampling and Reporting Strategy

Metrics are sampled on the client before reporting to minimize overhead.

- Default sampling rate: `0.2` (20%)
- Override with environment variable:

```bash
NEXT_PUBLIC_PERF_SAMPLE_RATE=0.1
```

Reporting behavior:

1. If `window.__soroTaskPerfReporter` exists and is a function, metrics are sent to it.
2. Otherwise, metrics are stored in `localStorage` under `sorotask_perf_metrics` (bounded to last 250 records).
3. In non-production builds, metrics are logged to the console with `[perf]` prefix.

This lets contributors wire metrics to any backend/observability service later without changing UI instrumentation points.

## How To Inspect Metrics Locally

1. Run the frontend and interact with route load, search, task open, and register flows.
2. Open browser devtools.
3. Read stored samples:

```js
JSON.parse(localStorage.getItem("sorotask_perf_metrics") || "[]")
```

## Interpreting Signals

- Compare medians and p95 values over time by metric name.
- Investigate regressions when `route_load_ms` or `search_latency_ms` shift materially after UI/data changes.
- Investigate regressions in `task_open_ms` for state/render bottlenecks.
- Investigate `mutation_register_task_ms` changes when network or client mutation logic changes.

## Performance Overhead Notes

- Timers use `performance.now()` and `requestAnimationFrame` only.
- Sampling keeps instrumentation work low on most interactions.
- Storage writes are small and bounded.
- No additional runtime dependencies are introduced.
