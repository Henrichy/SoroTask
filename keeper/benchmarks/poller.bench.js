const benny = require('benny');
const { rpc, nativeToScVal, Address, Networks } = require('@stellar/stellar-sdk');
const TaskPoller = require('../src/poller');
const { MockSorobanRpcServer } = require('../src/mockRpcServer');
const { createLogger } = require('../src/logger');

const { Server } = rpc;

// Disable logging for benchmarks to avoid noise and overhead
const logger = createLogger('bench');
logger.info = () => {};
logger.error = () => {};
logger.warn = () => {};

const CONTRACT_ID = 'CCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

function createMockTaskConfig() {
  const config = {
    last_run: 100n,
    interval: 60n,
    gas_balance: 1000n,
    creator: new Address('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'),
    target: new Address('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'),
    function: 'hello',
    args: [],
    resolver: null,
    whitelist: []
  };
  
  // Wrap in Option::Some (scvVec with 1 element)
  return nativeToScVal([config]);
}

async function runBenchmark() {
  const server = new MockSorobanRpcServer({
    port: 0, // Random port
    latestLedger: { sequence: 200 }, // Ensure tasks are due (100 + 60 <= 200)
    defaultSimulationResponse: {
      results: [{
        retval: createMockTaskConfig()
      }]
    }
  });

  const url = await server.start();
  const rpcServer = new Server(url, { allowHttp: true });
  
  const poller = new TaskPoller(rpcServer, CONTRACT_ID, {
    maxConcurrentReads: 100, // High concurrency for stress testing
    logger: logger
  });

  // Mock getAccount to avoid extra RPC call in getTaskConfig if possible
  rpcServer.getAccount = async () => ({
    sequence: '1'
  });

  const generateTaskIds = (count) => Array.from({ length: count }, (_, i) => i + 1);

  await benny.suite(
    'Polling Engine Performance',

    benny.add('Poll 10 Tasks', async () => {
      await poller.pollDueTasks(generateTaskIds(10));
    }),

    benny.add('Poll 100 Tasks', async () => {
      await poller.pollDueTasks(generateTaskIds(100));
    }),

    benny.add('Poll 500 Tasks', async () => {
      await poller.pollDueTasks(generateTaskIds(500));
    }),

    benny.cycle(),
    benny.complete(),
    benny.save({ file: 'polling-results', format: 'json', details: true }),
    benny.save({ file: 'polling-results', format: 'table.html' }),
  );

  await server.stop();
}

runBenchmark().catch(console.error);
