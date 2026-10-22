import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FexError, FexSdk } from '../src/index.js';
import {
  authToken,
  defaultAuthResponder,
  installFetchMock,
  jsonResponse,
  makeConfig,
} from './helpers.js';

function pendingResponse(): {
  promise: Promise<Response>;
  resolve: (value: Response) => void;
  reject: (reason: unknown) => void;
} {
  let resolve!: (value: Response) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<Response>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('Authentication', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('should authenticate the PSP', async () => {
    const { request, requestCount } = installFetchMock(defaultAuthResponder());
    const fex = new FexSdk(makeConfig());

    await fex.pspAuth();

    expect(requestCount()).toBe(1);
    expect(request()?.method).toBe('POST');
    expect(request()?.url).toBe('https://api.fex.com/api/psp/auth');
    const body = JSON.parse(request()?.body ?? '{}') as { apiKey: string; rsa: string };
    expect(body.apiKey).toBe(makeConfig().apiKey);
    expect(body.rsa).toBe(makeConfig().rsa);
  });

  it('should store the JWT', async () => {
    const fex = new FexSdk(makeConfig());
    installFetchMock(defaultAuthResponder());

    await fex.pspAuth();
    const client = (fex as unknown as { client: { jwt?: string; jwtExpiresAt?: number } }).client;

    expect(client.jwt).toBe('signed-jwt-token');
    expect(client.jwtExpiresAt).toBeDefined();
    expect(client.jwtExpiresAt as number).toBeGreaterThan(Date.now());
  });

  it('should reuse a valid JWT', async () => {
    const { requestCount } = installFetchMock((request) => {
      if (request.url.endsWith('/api/psp/auth')) {
        return jsonResponse(authToken());
      }
      if (request.url.includes('/transfer/')) {
        return jsonResponse({ id: 1, payer: { bank: 'A' }, payee: { bank: 'B' } });
      }
      if (request.url.includes('/key/')) {
        return jsonResponse({ key: 'k', name: 'n', document: 'd', psp: { name: 'p' } });
      }
      return jsonResponse({}, 404);
    });
    const fex = new FexSdk(makeConfig());

    await fex.pspAuth();
    await fex.detailTransfer('12313');
    await fex.getKey(213131);

    expect(requestCount()).toBe(3);
    expect(
      (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.filter(
        (call: unknown[]) => String(call[0]).endsWith('/api/psp/auth'),
      ),
    ).toHaveLength(1);
  });

  it('should renew an expired JWT', async () => {
    installFetchMock((request) => {
      if (request.url.endsWith('/api/psp/auth')) {
        return jsonResponse(authToken('10000'));
      }
      return jsonResponse({});
    });
    const fex = new FexSdk(makeConfig());

    await fex.pspAuth();
    await fex.detailTransfer('12313');

    vi.advanceTimersByTime(60_000);

    await fex.getKey(213131);

    const authCalls = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.filter(
      (call: unknown[]) => String(call[0]).endsWith('/api/psp/auth'),
    );

    expect(authCalls).toHaveLength(2);
  });

  it('should avoid simultaneous authentications', async () => {
    let authCount = 0;
    const authResponse = pendingResponse();
    const { requestCount } = installFetchMock((request) => {
      if (request.url.endsWith('/api/psp/auth')) {
        authCount += 1;
        return authResponse.promise;
      }
      return jsonResponse({});
    });
    const fex = new FexSdk(makeConfig());

    const first = fex.detailTransfer('1');
    const second = fex.detailTransfer('2');
    const third = fex.sendTransfer({ amount: 100, keyId: 1 });

    await vi.advanceTimersByTimeAsync(0);
    expect(authCount).toBe(1);
    expect(requestCount()).toBe(1);

    authResponse.resolve(jsonResponse(authToken()));

    await Promise.all([first, second, third]);

    expect(requestCount()).toBe(4);
    expect(authCount).toBe(1);
  });

  it('should not expose credentials in errors', async () => {
    installFetchMock((request) => {
      if (request.url.endsWith('/api/psp/auth')) {
        return jsonResponse({ message: 'invalid api key or rsa' }, 401);
      }
      return jsonResponse({}, 404);
    });
    const fex = new FexSdk(makeConfig());

    try {
      await fex.pspAuth();
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(FexError);
      const fexError = error as FexError;
      const message = fexError.message + JSON.stringify(fexError.details);
      expect(message).not.toContain(makeConfig().apiKey);
      expect(message).not.toContain(makeConfig().rsa);
      expect(message).not.toContain('signed-jwt-token');
      expect(fexError.status).toBe(401);
      expect(fexError.code).toBe('HTTP_401');
    }
  });
});
