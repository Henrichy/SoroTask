const EventEmitter = require("events");
const { createConcurrencyLimit } = require("./concurrency");

class ExecutionQueue extends EventEmitter {
  constructor(limit, metricsServer, options = {}) {
    super();

    this.concurrencyLimit = parseInt(
      limit || process.env.MAX_CONCURRENT_EXECUTIONS || 3,
      10,
    );

    this.limit = createConcurrencyLimit(this.concurrencyLimit);
    this.metricsServer = metricsServer;
    this.idempotencyGuard = options.idempotencyGuard || null;

    this.depth = 0;
    this.inFlight = 0;
    this.completed = 0;
    this.failedCount = 0;

    this.activePromises = [];
    this.failedTasks = new Set();
  }

  async enqueue(taskIds, executorFn) {
    const validTaskIds = taskIds.filter((id) => !this.failedTasks.has(id));

    this.depth = validTaskIds.length;

    // Track tasks due for this cycle
    if (this.metricsServer) {
      this.metricsServer.increment("tasksDueTotal", validTaskIds.length);
    }

    const cycleStartTime = Date.now();

    const cyclePromises = validTaskIds.map((taskId) => {
      return this.limit(async () => {
        let attemptContext = null;

        if (this.idempotencyGuard) {
          const lockResult = this.idempotencyGuard.acquire(taskId);
          if (!lockResult.acquired) {
            if (this.metricsServer) {
              this.metricsServer.increment("tasksSkippedIdempotencyTotal", 1);
            }
            this.emit("task:skipped", taskId, {
              reason: "idempotency_lock",
              attemptId: lockResult.attemptId,
            });
            return;
          }
          attemptContext = { attemptId: lockResult.attemptId };
        }

        this.inFlight++;
        this.depth = Math.max(this.depth - 1, 0);

        if (attemptContext) {
          this.emit("task:started", taskId, attemptContext);
        } else {
          this.emit("task:started", taskId);
        }

        try {
          if (attemptContext) {
            await executorFn(taskId, attemptContext);
          } else {
            await executorFn(taskId);
          }
          this.completed++;
          if (this.metricsServer) {
            this.metricsServer.increment("tasksExecutedTotal", 1);
          }
          if (this.idempotencyGuard) {
            this.idempotencyGuard.markCompleted(taskId, {
              attemptId: attemptContext?.attemptId,
            });
          }
          this.emit("task:success", taskId);
        } catch (error) {
          this.failedCount++;
          this.failedTasks.add(taskId);
          if (this.metricsServer) {
            this.metricsServer.increment("tasksFailedTotal", 1);
          }
          if (this.idempotencyGuard) {
            this.idempotencyGuard.markFailed(taskId, {
              attemptId: attemptContext?.attemptId,
              lastError: error.message || String(error),
            });
          }
          this.emit("task:failed", taskId, error);
        } finally {
          this.inFlight--;
        }
      });
    });

    this.activePromises.push(...cyclePromises);

    try {
      await Promise.all(cyclePromises);
    } catch (_) {
      // already handled
    } finally {
      const cycleDuration = Date.now() - cycleStartTime;
      if (this.metricsServer?.record) {
        this.metricsServer.record("lastCycleDurationMs", cycleDuration);
      }

      this.emit("cycle:complete", {
        depth: this.depth,
        inFlight: this.inFlight,
        completed: this.completed,
        failed: this.failedCount,
      });

      this.activePromises = [];
      this.completed = 0;
      this.failedCount = 0;
    }
  }

  async drain() {
    this.limit.clearQueue();
    this.depth = 0;

    if (this.activePromises.length > 0) {
      await Promise.allSettled(this.activePromises);
    }

    while (this.inFlight > 0) {
      await new Promise((r) => setTimeout(r, 50));
    }
  }
}

module.exports = { ExecutionQueue };
