import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FexError, FexSdk, TransferStatus } from '../src/index.js';
import { authToken, installFetchMock, jsonResponse, makeConfig, textResponse } from './helpers.js';

describe('HTTP client', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('should send Authorization: Bearer on authenticated requests', async () => {
    const { request } = installFetchMock((req) => {
      if (req.url.endsWith('/api/psp/auth')) {
        return jsonResponse(authToken());
      }
      return jsonResponse({ id: 'abc', amount: 1000, key: 'k' });
    });
    const fex = new FexSdk(makeConfig());

    await fex.sendTransfer({ amount: 1000, keyId: 12112121 });

    expect(request(1)?.headers.get('Authorization')).toBe('Bearer signed-jwt-token');
  });

  it('should send Content-Type and Accept headers', async () => {
    const { request } = installFetchMock((req) =>
      req.url.endsWith('/api/psp/auth') ? jsonResponse(authToken()) : jsonResponse({}),
    );
    const fex = new FexSdk(makeConfig());

    await fex.pspAuth();
    await fex.getKey(213131);

    expect(request(0)?.headers.get('Content-Type')).toBe('application/json');
    expect(request(0)?.headers.get('Accept')).toBe('application/json');
    expect(request(1)?.headers.get('Content-Type')).toBe('application/json');
    expect(request(1)?.headers.get('Accept')).toBe('application/json');
  });

  it('should throw FexError on HTTP 400', async () => {
    installFetchMock((req) =>
      req.url.endsWith('/api/psp/auth')
        ? jsonResponse(authToken())
        : jsonResponse({ message: 'invalid amount' }, 400),
    );
    const fex = new FexSdk(makeConfig());

    await expect(fex.detailTransfer('12313')).rejects.toMatchObject({
      status: 400,
      code: 'HTTP_400',
      message: 'invalid amount',
    });
  });

  it('should throw FexError on HTTP 401', async () => {
    installFetchMock(() => jsonResponse({ message: 'unauthorized' }, 401));
    const fex = new FexSdk(makeConfig());

    const error = await fex.pspAuth().then(
      () => undefined,
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(FexError);
    const fexError = error as FexError;
    expect(fexError.status).toBe(401);
    expect(fexError.code).toBe('HTTP_401');
    expect(fexError.message).toBe('unauthorized');
  });

  it('should throw FexError on HTTP 404', async () => {
    installFetchMock((req) =>
      req.url.endsWith('/api/psp/auth')
        ? jsonResponse(authToken())
        : jsonResponse({ message: 'not found' }, 404),
    );
    const fex = new FexSdk(makeConfig());

    await expect(fex.detailTransfer('99999')).rejects.toMatchObject({
      status: 404,
      code: 'HTTP_404',
      message: 'not found',
    });
  });

  it('should throw FexError on HTTP 500', async () => {
    installFetchMock((req) =>
      req.url.endsWith('/api/psp/auth')
        ? jsonResponse(authToken())
        : jsonResponse({ message: 'internal error' }, 500),
    );
    const fex = new FexSdk(makeConfig());

    await expect(fex.getKey(1)).rejects.toMatchObject({
      status: 500,
      code: 'SERVER_ERROR',
      message: 'internal error',
    });
  });

  it('should handle non-JSON ok responses', async () => {
    installFetchMock((req) =>
      req.url.endsWith('/api/psp/auth') ? jsonResponse(authToken()) : textResponse('ok'),
    );
    const fex = new FexSdk(makeConfig());

    await expect(
      fex.ackTransfer('123', { status: TransferStatus.OK, reason: 'ok' }),
    ).resolves.toBeUndefined();
  });

  it('should throw FexError on timeout', async () => {
    installFetchMock((req, init) => {
      if (req.url.endsWith('/api/psp/auth')) {
        return jsonResponse(authToken());
      }
      return new Promise<Response>((_resolve, reject) => {
        const signal = init.signal;
        signal.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        });
      });
    });
    const fex = new FexSdk(makeConfig({ timeout: 100 }));

    const pending = fex.detailTransfer('1').catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(200);

    const error = await pending;
    expect(error).toBeInstanceOf(FexError);
    expect((error as FexError).code).toBe('TIMEOUT');
    expect((error as FexError).status).toBeUndefined();
  });

  it('should throw FexError when fetch rejects (network error)', async () => {
    installFetchMock(() => Promise.reject(new TypeError('fetch failed')));
    const fex = new FexSdk(makeConfig({ timeout: 100 }));

    await expect(fex.pspAuth()).rejects.toMatchObject({ code: 'CONNECTION_ERROR' });
  });
});
