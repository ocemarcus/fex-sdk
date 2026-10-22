import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FexSdk, TransferStatus } from '../src/index.js';
import { authToken, installFetchMock, jsonResponse, makeConfig } from './helpers.js';

function transferResponder() {
  return (request: { url: string }) => {
    if (request.url.endsWith('/api/psp/auth')) {
      return jsonResponse(authToken());
    }
    if (request.url.includes('/transfer/') && request.url.endsWith('/ack')) {
      return jsonResponse('ok');
    }
    if (request.url.includes('/transfer/')) {
      return jsonResponse({
        id: 12313,
        amount: 1000,
        key: '+5531989292700',
        payer: { bank: 'PSP A' },
        payee: { bank: 'PSP B', holder: { name: 'Marcus', document: '22434332' } },
      });
    }
    return jsonResponse({}, 404);
  };
}

describe('Transfer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('should create a transfer', async () => {
    const { request, requestCount } = installFetchMock((req) => {
      if (req.url.endsWith('/api/psp/auth')) {
        return jsonResponse(authToken());
      }
      if (req.url.endsWith('/api/psp/transfer')) {
        return jsonResponse({ id: 'abc-123', amount: 1000, key: '+5531989292700' });
      }
      return jsonResponse({}, 404);
    });
    const fex = new FexSdk(makeConfig());

    const transfer = await fex.sendTransfer({ amount: 1000, keyId: 12112121 });

    expect(transfer).toEqual({ id: 'abc-123', amount: 1000, key: '+5531989292700' });
    expect(requestCount()).toBe(2);
    expect(request(1)?.method).toBe('POST');
    expect(request(1)?.url).toBe('https://api.fex.com/api/psp/transfer');
    expect(request(1)?.body).toBe(JSON.stringify({ amount: 1000, keyId: 12112121 }));
  });

  it('should fetch transfer details', async () => {
    const { request, requestCount } = installFetchMock(transferResponder());
    const fex = new FexSdk(makeConfig());

    const detail = await fex.detailTransfer('12313');

    expect(detail).toEqual({
      id: 12313,
      amount: 1000,
      key: '+5531989292700',
      payer: { bank: 'PSP A' },
      payee: { bank: 'PSP B', holder: { name: 'Marcus', document: '22434332' } },
    });
    expect(requestCount()).toBe(2);
    expect(request(1)?.method).toBe('GET');
    expect(request(1)?.url).toBe('https://api.fex.com/api/psp/transfer/12313');
  });

  it('should approve a transfer', async () => {
    const { request, requestCount } = installFetchMock(transferResponder());
    const fex = new FexSdk(makeConfig());

    await expect(
      fex.ackTransfer('12313', { status: TransferStatus.OK, reason: 'ok' }),
    ).resolves.toBeUndefined();

    expect(requestCount()).toBe(2);
    expect(request(1)?.method).toBe('PATCH');
    expect(request(1)?.url).toBe('https://api.fex.com/api/psp/transfer/12313/ack');
    expect(request(1)?.body).toBe(JSON.stringify({ status: 'OK', reason: 'ok' }));
  });

  it('should reject a transfer', async () => {
    const { request } = installFetchMock(transferResponder());
    const fex = new FexSdk(makeConfig());

    await expect(
      fex.ackTransfer('12313', { status: TransferStatus.REJECT, reason: 'invalid' }),
    ).resolves.toBeUndefined();

    expect(request(1)?.body).toBe(JSON.stringify({ status: 'REJECT', reason: 'invalid' }));
  });
});
