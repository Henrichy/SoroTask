const EventEmitter = require('events');
const { createConcurrencyLimit } = require('./concurrency');

class ExecutionQueue extends EventEmitter {
  constructor(limit, metricsServer, deadLetterQueue) {
    super();

    this.concurrencyLimit = parseInt(
      limit || process.env.MAX_CONCURRENT_EXECUTIONS || 3,
      10,
    );

    this.limit = createConcurrencyLimit(this.concurrencyLimit);
    this.metricsServer = metricsServer;
    this.deadLetterQueue = deadLetterQueue;

    this.depth = 0;
    this.inFlight = 0;
    this.completed = 0;
    this.failedCount = 0;

    this.activePromises = [];
    this.failedTasks = new Set();
  }

  async enqueue(taskIds, executorFn, taskConfigGetter) {
    // Filter out quarantined tasks and previously failed tasks
    const quarantinedTaskIds = [];
    const validTaskIds = taskIds.filter((id) => {
      if (this.failedTasks.has(id)) {
        return false;
      }
      
      // Check if task is quarantined in dead-letter queue
      if (this.deadLetterQueue && this.deadLetterQueue.isQuarantined(id)) {
        quarantinedTaskIds.push(id);
        return false;
      }
      
      return true;
    });

    // Track quarantined tasks that were filtered out
    if (quarantinedTaskIds.length > 0 && this.metricsServer) {
      this.metricsServer.increment('tasksQuarantinedSkipped', quarantinedTaskIds.length);
    }

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

        let taskConfig = null;
        let attempt = 0;

        try {
          // Get task config for dead-letter context if getter provided
          if (taskConfigGetter) {
            try {
              taskConfig = await taskConfigGetter(taskId);
            } catch (configError) {
              // Log but don't fail execution if config fetch fails
              this.emit('task:config-fetch-failed', taskId, configError);
            }
          }

          attempt = this.deadLetterQueue 
            ? this.deadLetterQueue.getFailureCount(taskId) + 1 
            : 1;

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

          // Record failure in dead-letter queue
          if (this.deadLetterQueue) {
            this.deadLetterQueue.recordFailure(taskId, {
              error,
              errorClassification: error.classification || 'retryable',
              attempt,
              txHash: error.txHash || null,
              taskConfig,
              phase: error.phase || 'execution',
            });
          }

          this.emit('task:failed', taskId, error);
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
