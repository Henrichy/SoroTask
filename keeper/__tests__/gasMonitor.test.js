// Simple GasMonitor tests
const { GasMonitor } = require('../src/gasMonitor');

describe('GasMonitor', () => {
  let gasMonitor;

  beforeEach(() => {
    gasMonitor = new GasMonitor();
  });

  it('should create GasMonitor instance', () => {
    expect(gasMonitor).toBeDefined();
  });

  it('should have default threshold', () => {
    expect(gasMonitor.GAS_WARN_THRESHOLD).toBeDefined();
  });

  it('should get low gas count', () => {
    const count = gasMonitor.getLowGasCount();
    expect(typeof count).toBe('number');
  });

  it('should get config', () => {
    const config = gasMonitor.getConfig();
    expect(config).toBeDefined();
    expect(config.gasWarnThreshold).toBeDefined();
  });

  it('should check gas balance without throwing', async () => {
    const result = await gasMonitor.checkGasBalance('task1', 100);
    expect(typeof result).toBe('boolean');
  });
});
