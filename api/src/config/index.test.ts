describe('config', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('uses sane defaults in test mode', async () => {
    process.env.NODE_ENV = 'test';
    delete process.env.PORT;
    delete process.env.FRONTEND_URL;
    delete process.env.LOG_LEVEL;

    const { default: config } = await import('./index');

    expect(config.port).toBe(6543);
    expect(config.frontendUrl).toBe('http://localhost:5173');
    expect(config.isTest).toBe(true);
    expect(config.logging.prettyPrint).toBe(true);
    expect(config.logging.level).toBe('debug');
  });

  it('parses worker configuration from environment', async () => {
    process.env.NODE_ENV = 'test';
    process.env.WORKER_ID = '2';
    process.env.TOTAL_WORKERS = '5';

    const { default: config } = await import('./index');

    expect(config.worker.id).toBe(2);
    expect(config.worker.total).toBe(5);
  });

  it('throws in non-test mode when steam key is missing', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.STEAM_API_KEY;
    delete process.env.STEAM_API_KEY_0;
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_KEY = 'service-key';

    await expect(import('./index')).rejects.toThrow('STEAM_API_KEY is required');
  });
});
