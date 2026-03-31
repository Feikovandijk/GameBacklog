describe('supabase client', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV, NODE_ENV: 'test' };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('creates the client with configured service credentials', async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_KEY = 'service-role-key';

    const createClient = jest.fn(() => ({ mocked: true }));

    jest.doMock('@supabase/supabase-js', () => ({
      createClient,
    }));

    const { supabase } = await import('./client');

    expect(createClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'service-role-key'
    );
    expect(supabase).toEqual({ mocked: true });
  });

  it('throws when required service credentials are missing', async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_KEY;

    jest.doMock('@supabase/supabase-js', () => ({
      createClient: jest.fn(),
    }));

    await expect(import('./client')).rejects.toThrow(
      'Supabase URL or service role key is not defined in the configuration.'
    );
  });
});
