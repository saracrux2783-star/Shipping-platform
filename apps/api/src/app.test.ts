import { createServer } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { handleRequest } from './app.js';

const server = createServer(handleRequest);
let baseUrl = '';

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (address === null || typeof address === 'string')
    throw new Error('Unexpected address');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  );
});

describe('health endpoint', () => {
  it('returns an ok status', async () => {
    const response = await fetch(`${baseUrl}/health`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
  });
});
