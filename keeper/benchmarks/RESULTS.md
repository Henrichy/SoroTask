# SoroTask Keeper Benchmarking Results

## Performance Overview
This document tracks the performance metrics for the `SoroTask Keeper` polling engine.

## Benchmarks Run
| Date | Task Count | Ops/Sec | Average Latency | Bottlenecks Identified |
|------|------------|---------|-----------------|------------------------|
| 2026-03-29 | 10         | 1,034   | ~0.97 ms        | Minimal                |
| 2026-03-29 | 100        | 342     | ~2.92 ms        | Concurrency Overhaed   |
| 2026-03-29 | 500        | 76      | ~13.15 ms       | RPC Simulation Bottleneck |

## Detailed Analysis
The polling engine scales well within the tested range. The throughput (task-checks/sec) increases as the task count increases, indicating that per-call overhead (like `getLatestLedger`) is amortized over more tasks.

### Bottlenecks
- **RPC Simulation Overhead**: Even with a mock server, the cumulative latency of hundreds of `simulateTransaction` calls per polling cycle becomes significant.
- **XDR Decoding Phase**: Decoding hundreds of `ScVal` objects into native JavaScript objects takes measurable CPU time.
- **Concurrency Limit**: The `maxConcurrentReads` setting limits how many tasks are checked at once, which is essential for network safety but introduces some queueing latency.

### Recommendations
- **Batching Support**: If the Soroban RPC ever supports batch `simulateTransaction` calls, the poller should be updated to use them.
- **Incremental Polling**: Consider polling only for tasks that have recently emitted a `TaskRegistered` or `TaskExecuted` event to reduce the number of checks.
- **Parallel Workers**: For checking thousands of tasks, the `TaskPoller` could be distributed across multiple processes or instances.
