describe('csrf middleware module', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('exports csrf helpers in non-production environments', async () => {
    process.env.NODE_ENV = 'test';
    delete process.env.CSRF_SECRET;

    const csrf = await import('./csrf');

    expect(typeof csrf.generateCsrfToken).toBe('function');
    expect(typeof csrf.doubleCsrfProtection).toBe('function');
    expect(csrf.invalidCsrfTokenError).toBeDefined();
  });

  it('throws in production when CSRF_SECRET is missing', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.CSRF_SECRET;

    await expect(import('./csrf')).rejects.toThrow(
      'CSRF_SECRET environment variable must be set in production.'
    );
  });
});
