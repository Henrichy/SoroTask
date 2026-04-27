const EventEmitter = require('events');
const { createConcurrencyLimit } = require('./concurrency');
const { acquireLock, releaseLock } = require('./lock');
const { createLogger } = require('./logger');

const lockerLogger = createLogger('queue-locker');

class ExecutionQueue extends EventEmitter {
  constructor(limit, metricsServer) {
    super();

    this.concurrencyLimit = parseInt(
      limit || process.env.MAX_CONCURRENT_EXECUTIONS || 3,
      10,
    );

    this.limit = createConcurrencyLimit(this.concurrencyLimit);
    this.metricsServer = metricsServer;

    this.depth = 0;
    this.inFlight = 0;
    this.completed = 0;
    this.failedCount = 0;

    this.activePromises = [];
    this.failedTasks = new Set();
  }

  async enqueue(taskIds, executorFn) {
    const validTaskIds = taskIds.filter(
      (id) => !this.failedTasks.has(id),
    );

    this.depth = validTaskIds.length;

    // Track tasks due for this cycle
    if (this.metricsServer) {
      this.metricsServer.increment('tasksDueTotal', validTaskIds.length);
    }

    const cycleStartTime = Date.now();

    const cyclePromises = validTaskIds.map((taskId) => {
      return this.limit(async () => {
        this.inFlight++;
        this.depth = Math.max(this.depth - 1, 0);

        this.emit('task:started', taskId);

        // Distributed lock: attempt to claim the task before executing
        const lockTtl = parseInt(process.env.LOCK_TTL_MS || '60000', 10);
        let token = null;
        try {
          token = await acquireLock(taskId, lockTtl);
          if (!token) {
            // Another keeper has claimed this task
            lockerLogger.info('Task claim skipped due to existing lock', { taskId });
            if (this.metricsServer) this.metricsServer.increment('tasksClaimedByOther', 1);
            this.emit('task:skipped:locked', taskId);
            return;
          }

          // Execute the task under our lock
          await executorFn(taskId);
          this.completed++;
          if (this.metricsServer) {
            this.metricsServer.increment('tasksExecutedTotal', 1);
          }
          this.emit('task:success', taskId);
        } catch (error) {
          this.failedCount++;
          this.failedTasks.add(taskId);
          if (this.metricsServer) {
            this.metricsServer.increment('tasksFailedTotal', 1);
          }
          this.emit('task:failed', taskId, error);
        } finally {
          // Attempt to release the lock if we hold it
          try {
            if (token) {
              const released = await releaseLock(taskId, token);
              if (!released) {
                lockerLogger.warn('Lock release failed (token mismatch or expired)', { taskId });
              }
            }
          } catch (err) {
            lockerLogger.error('Error releasing lock', { taskId, error: err.message });
          }

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
        this.metricsServer.record('lastCycleDurationMs', cycleDuration);
      }

      this.emit('cycle:complete', {
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
