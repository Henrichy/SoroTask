const http = require('http');
const promClient = require('prom-client');

/**
 * Metrics store for tracking operational statistics.
 * Combines task execution metrics with gas monitoring metrics.
 */
class Metrics {
  constructor() {
    this.counters = {
      tasksCheckedTotal: 0,
      tasksDueTotal: 0,
      tasksExecutedTotal: 0,
      tasksFailedTotal: 0,
      tasksQuarantinedSkipped: 0,
    };

    this.gauges = {
      avgFeePaidXlm: 0,
      lastCycleDurationMs: 0,
    };

    this.feeSamples = [];
    this.maxFeeSamples = 100;

    this.startTime = Date.now();
    this.lastPollAt = null;
    this.rpcConnected = false;
  }

  increment(key, amount = 1) {
    if (key in this.counters) {
      this.counters[key] += amount;
    }
  }

  record(key, value) {
    if (key === 'avgFeePaidXlm') {
      this.feeSamples.push(value);
      if (this.feeSamples.length > this.maxFeeSamples) {
        this.feeSamples.shift();
      }
      this.gauges.avgFeePaidXlm =
        this.feeSamples.reduce((sum, v) => sum + v, 0) /
        this.feeSamples.length;
    } else if (key in this.gauges) {
      this.gauges[key] = value;
    }
  }

  updateHealth(state) {
    if (state.lastPollAt) {
      this.lastPollAt = state.lastPollAt;
    }
    if (typeof state.rpcConnected === 'boolean') {
      this.rpcConnected = state.rpcConnected;
    }
  }

  snapshot() {
    return {
      ...this.counters,
      ...this.gauges,
    };
  }

  getHealthStatus(staleThreshold) {
    const now = Date.now();
    const uptimeSeconds = Math.floor((now - this.startTime) / 1000);
    const isStale =
      this.lastPollAt &&
      now - this.lastPollAt.getTime() > staleThreshold;

    return {
      status: isStale ? 'stale' : 'ok',
      uptime: uptimeSeconds,
      lastPollAt: this.lastPollAt ? this.lastPollAt.toISOString() : null,
      rpcConnected: this.rpcConnected,
    };
  }

  reset() {
    this.counters = {
      tasksCheckedTotal: 0,
      tasksDueTotal: 0,
      tasksExecutedTotal: 0,
      tasksFailedTotal: 0,
    };
    this.gauges = {
      avgFeePaidXlm: 0,
      lastCycleDurationMs: 0,
    };
    this.feeSamples = [];
  }
}

class MetricsServer {
  constructor(gasMonitor, logger, deadLetterQueue) {
    this.gasMonitor = gasMonitor;
    this.logger = logger;
    this.deadLetterQueue = deadLetterQueue;
    this.port = parseInt(process.env.METRICS_PORT, 10) || 3000;
    this.healthStaleThreshold = parseInt(
      process.env.HEALTH_STALE_THRESHOLD_MS || '60000',
      10,
    );
    this.server = null;
    this.metrics = new Metrics();

    // Initialize Prometheus registry and metrics
    this.register = new promClient.Registry();
    this.initPrometheusMetrics();
  }

  initPrometheusMetrics() {
    // Counter: Total tasks checked
    this.promTasksChecked = new promClient.Counter({
      name: 'keeper_tasks_checked_total',
      help: 'Total number of tasks checked for execution eligibility',
      registers: [this.register],
    });

    // Counter: Total tasks due for execution
    this.promTasksDue = new promClient.Counter({
      name: 'keeper_tasks_due_total',
      help: 'Total number of tasks that were due for execution',
      registers: [this.register],
    });

    // Counter: Total tasks executed successfully
    this.promTasksExecuted = new promClient.Counter({
      name: 'keeper_tasks_executed_total',
      help: 'Total number of tasks executed successfully',
      registers: [this.register],
    });

    // Counter: Total tasks failed
    this.promTasksFailed = new promClient.Counter({
      name: 'keeper_tasks_failed_total',
      help: 'Total number of tasks that failed during execution',
      registers: [this.register],
    });

    // Counter: Total tasks skipped due to quarantine
    this.promTasksQuarantinedSkipped = new promClient.Counter({
      name: 'keeper_tasks_quarantined_skipped_total',
      help: 'Total number of tasks skipped because they are quarantined',
      registers: [this.register],
    });

    // Gauge: Number of quarantined tasks
    this.promQuarantinedCount = new promClient.Gauge({
      name: 'keeper_quarantined_tasks_count',
      help: 'Current number of tasks in quarantine',
      registers: [this.register],
    });

    // Counter: Total tasks quarantined
    this.promTotalQuarantined = new promClient.Counter({
      name: 'keeper_tasks_quarantined_total',
      help: 'Total number of tasks that have been quarantined',
      registers: [this.register],
    });

    // Counter: Total tasks recovered from quarantine
    this.promTotalRecovered = new promClient.Counter({
      name: 'keeper_tasks_recovered_total',
      help: 'Total number of tasks recovered from quarantine',
      registers: [this.register],
    });

    // Gauge: Average fee paid in XLM
    this.promAvgFee = new promClient.Gauge({
      name: 'keeper_avg_fee_paid_xlm',
      help: 'Average transaction fee paid in XLM (rolling average)',
      registers: [this.register],
    });

    // Gauge: Last cycle duration
    this.promCycleDuration = new promClient.Gauge({
      name: 'keeper_last_cycle_duration_ms',
      help: 'Duration of the last polling cycle in milliseconds',
      registers: [this.register],
    });

    // Gauge: Low gas count
    this.promLowGasCount = new promClient.Gauge({
      name: 'keeper_low_gas_count',
      help: 'Number of tasks with low gas balance',
      registers: [this.register],
    });

    // Gauge: Keeper uptime
    this.promUptime = new promClient.Gauge({
      name: 'keeper_uptime_seconds',
      help: 'Keeper service uptime in seconds',
      registers: [this.register],
    });

    // Gauge: RPC connection status (1 = connected, 0 = disconnected)
    this.promRpcConnected = new promClient.Gauge({
      name: 'keeper_rpc_connected',
      help: 'RPC connection status (1 = connected, 0 = disconnected)',
      registers: [this.register],
    });

    // Add default metrics (process CPU, memory, etc.)
    promClient.collectDefaultMetrics({ register: this.register });
  }

  syncPrometheusMetrics() {
    // Sync internal metrics to Prometheus metrics
    this.promTasksChecked.inc(0); // Initialize if not set
    this.promTasksDue.inc(0);
    this.promTasksExecuted.inc(0);
    this.promTasksFailed.inc(0);
    this.promTasksQuarantinedSkipped.inc(0);

    this.promAvgFee.set(this.metrics.gauges.avgFeePaidXlm);
    this.promCycleDuration.set(this.metrics.gauges.lastCycleDurationMs);
    this.promLowGasCount.set(this.gasMonitor.getLowGasCount());

    // Sync dead-letter queue metrics
    if (this.deadLetterQueue) {
      const dlqStats = this.deadLetterQueue.getStats();
      this.promQuarantinedCount.set(dlqStats.activeQuarantined);
      this.promTotalQuarantined.inc(0); // Initialize
      this.promTotalRecovered.inc(0); // Initialize
    }

    const uptimeSeconds = Math.floor((Date.now() - this.metrics.startTime) / 1000);
    this.promUptime.set(uptimeSeconds);
    this.promRpcConnected.set(this.metrics.rpcConnected ? 1 : 0);
  }

  start() {
    this.server = http.createServer((req, res) => {
      if (req.url === '/health' || req.url === '/health/') {
        this.handleHealth(res);
      } else if (req.url === '/metrics' || req.url === '/metrics/') {
        this.handleMetrics(res);
      } else if (req.url === '/metrics/prometheus' || req.url === '/metrics/prometheus/') {
        this.handlePrometheusMetrics(res);
      } else if (req.url === '/dead-letter' || req.url === '/dead-letter/') {
        this.handleDeadLetter(res);
      } else if (req.url.startsWith('/dead-letter/')) {
        this.handleDeadLetterTask(req, res);
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    this.server.listen(this.port, () => {
      this.logger.info(`Metrics server running on port ${this.port}`);
      this.logger.info(
        `Health endpoint: http://localhost:${this.port}/health`,
      );
      this.logger.info(
        `Metrics endpoint: http://localhost:${this.port}/metrics`,
      );
      this.logger.info(
        `Prometheus endpoint: http://localhost:${this.port}/metrics/prometheus`,
      );
      this.logger.info(
        `Dead-letter queue endpoint: http://localhost:${this.port}/dead-letter`,
      );
    });
  }

  handleHealth(res) {
    const healthStatus = this.metrics.getHealthStatus(
      this.healthStaleThreshold,
    );
    const httpStatus = healthStatus.status === 'stale' ? 503 : 200;

    res.writeHead(httpStatus, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(healthStatus, null, 2));
  }

  handleMetrics(res) {
    const gasConfig = this.gasMonitor.getConfig();
    const taskMetrics = this.metrics.snapshot();

    const metricsData = {
      // Task execution metrics
      ...taskMetrics,

      // Gas monitoring metrics
      lowGasCount: this.gasMonitor.getLowGasCount(),
      gasWarnThreshold: gasConfig.gasWarnThreshold,
      alertDebounceMs: gasConfig.alertDebounceMs,
      alertWebhookEnabled: gasConfig.alertWebhookEnabled,

      // Dead-letter queue metrics
      deadLetterQueue: this.deadLetterQueue ? this.deadLetterQueue.getStats() : null,
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(metricsData, null, 2));
  }

  async handlePrometheusMetrics(res) {
    try {
      // Sync current metrics to Prometheus
      this.syncPrometheusMetrics();

      // Get Prometheus formatted metrics
      const metrics = await this.register.metrics();

      res.writeHead(200, { 'Content-Type': this.register.contentType });
      res.end(metrics);
    } catch (error) {
      this.logger.error('Error generating Prometheus metrics', { error: error.message });
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  }

  handleDeadLetter(res) {
    if (!this.deadLetterQueue) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Dead-letter queue not enabled' }));
      return;
    }

    try {
      const stats = this.deadLetterQueue.getStats();
      const records = this.deadLetterQueue.getAllRecords({ limit: 100 });

      const response = {
        stats,
        records,
        quarantinedTasks: this.deadLetterQueue.getQuarantinedTasks(),
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response, null, 2));
    } catch (error) {
      this.logger.error('Error fetching dead-letter queue data', { error: error.message });
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
    }
  }

  handleDeadLetterTask(req, res) {
    if (!this.deadLetterQueue) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Dead-letter queue not enabled' }));
      return;
    }

    try {
      // Extract task ID from URL: /dead-letter/123
      const taskIdStr = req.url.split('/')[2];
      const taskId = parseInt(taskIdStr, 10);

      if (isNaN(taskId)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid task ID' }));
        return;
      }

      const record = this.deadLetterQueue.getRecord(taskId);

      if (!record) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Task not found in dead-letter queue' }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(record, null, 2));
    } catch (error) {
      this.logger.error('Error fetching dead-letter task', { error: error.message });
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
    }
  }

  updateHealth(state) {
    this.metrics.updateHealth(state);
  }

  increment(key, amount) {
    this.metrics.increment(key, amount);

    // Update Prometheus counters
    if (key === 'tasksCheckedTotal') {
      this.promTasksChecked.inc(amount);
    } else if (key === 'tasksDueTotal') {
      this.promTasksDue.inc(amount);
    } else if (key === 'tasksExecutedTotal') {
      this.promTasksExecuted.inc(amount);
    } else if (key === 'tasksFailedTotal') {
      this.promTasksFailed.inc(amount);
    } else if (key === 'tasksQuarantinedSkipped') {
      this.promTasksQuarantinedSkipped.inc(amount);
    }
  }

  record(key, value) {
    this.metrics.record(key, value);

    // Update Prometheus gauges
    if (key === 'avgFeePaidXlm') {
      this.promAvgFee.set(this.metrics.gauges.avgFeePaidXlm);
    } else if (key === 'lastCycleDurationMs') {
      this.promCycleDuration.set(value);
    }
  }

  stop() {
    if (this.server) {
      this.server.close();
      this.logger.info('Metrics server stopped');
    }
  }
}

module.exports = { Metrics, MetricsServer };
