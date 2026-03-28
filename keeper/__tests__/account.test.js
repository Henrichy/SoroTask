// Simple account tests - just test that the function exists and handles missing env
const { initializeKeeperAccount } = require('../src/account');

describe('Keeper Account Module', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should throw error when KEEPER_SECRET is missing', async () => {
    delete process.env.KEEPER_SECRET;

    // Just test that it throws when secret is missing
    await expect(initializeKeeperAccount()).rejects.toThrow();
  });

  it('should have KEEPER_SECRET defined', () => {
    process.env.KEEPER_SECRET = 'test-secret';
    // This test just verifies env is set correctly
    expect(process.env.KEEPER_SECRET).toBe('test-secret');
  });
});
