import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildServer } from './server.js';

describe('DesignRail API', () => {
  let app: Awaited<ReturnType<typeof buildServer>>;

  beforeAll(async () => {
    app = await buildServer();
  });

  afterAll(async () => {
    await app.close();
  });

  it('resolves the hello query', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      headers: { 'content-type': 'application/json' },
      payload: { query: '{ hello }' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ data: { hello: 'world' } });
  });
});
