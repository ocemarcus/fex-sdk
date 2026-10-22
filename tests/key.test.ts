import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FexSdk } from '../src/index.js';
import { authToken, installFetchMock, jsonResponse, makeConfig } from './helpers.js';

function keyResponder() {
  return (request: { url: string }) => {
    if (request.url.endsWith('/api/psp/auth')) {
      return jsonResponse(authToken());
    }
    if (request.url.endsWith('/api/psp/key')) {
      return jsonResponse({
        id: 1,
        key: '+5531989292700',
        name: 'Marcus',
        document: '22434332',
      });
    }
    if (request.url.includes('/api/psp/key/')) {
      return jsonResponse({
        key: '+5531989292700',
        name: 'Marcus',
        document: '22434332',
        psp: { name: 'PSP B' },
      });
    }
    return jsonResponse({}, 404);
  };
}

describe('Key', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('should create a key', async () => {
    const { request, requestCount } = installFetchMock(keyResponder());
    const fex = new FexSdk(makeConfig());

    const key = await fex.createKey({
      key: '+5531989292700',
      name: 'Marcus',
      document: '22434332',
    });

    expect(key).toEqual({
      id: 1,
      key: '+5531989292700',
      name: 'Marcus',
      document: '22434332',
    });
    expect(requestCount()).toBe(2);
    expect(request(1)?.method).toBe('POST');
    expect(request(1)?.url).toBe('https://api.fex.com/api/psp/key');
    expect(request(1)?.body).toBe(
      JSON.stringify({ key: '+5531989292700', name: 'Marcus', document: '22434332' }),
    );
  });

  it('should fetch a key by id', async () => {
    const { request, requestCount } = installFetchMock(keyResponder());
    const fex = new FexSdk(makeConfig());

    const key = await fex.getKey(213131);

    expect(key).toEqual({
      key: '+5531989292700',
      name: 'Marcus',
      document: '22434332',
      psp: { name: 'PSP B' },
    });
    expect(requestCount()).toBe(2);
    expect(request(1)?.method).toBe('GET');
    expect(request(1)?.url).toBe('https://api.fex.com/api/psp/key/213131');
  });
});
