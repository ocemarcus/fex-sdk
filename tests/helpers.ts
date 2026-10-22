import { vi } from 'vitest';
import type { FexSdkConfig } from '../src/index.js';

export const apiKey = '550e8400-e29b-41d4-a716-446655440000';
export const rsa = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB';
export const baseUrl = 'https://api.fex.com';

export function makeConfig(overrides: Partial<FexSdkConfig> = {}): FexSdkConfig {
  return {
    baseUrl,
    apiKey,
    rsa,
    ...overrides,
  };
}

export interface RecordedRequest {
  url: string;
  method: string;
  headers: Headers;
  body: string | undefined;
}

export type FetchHandler = (
  request: RecordedRequest,
  init?: RequestInit,
) => Response | Promise<Response>;

export function installFetchMock(handler: FetchHandler) {
  const requests: RecordedRequest[] = [];

  const mock = vi.fn((input: string | URL, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    const request: RecordedRequest = {
      url: String(input),
      method: String(init.method ?? 'GET'),
      headers,
      body: typeof init.body === 'string' ? init.body : undefined,
    };
    requests.push(request);
    return Promise.resolve(handler(request, init));
  });

  vi.stubGlobal('fetch', mock);

  return {
    requests,
    mock,
    request: (index = 0) => requests[index],
    requestCount: () => requests.length,
    authCalls: () => requests.filter((r) => r.url.endsWith('/api/psp/auth')),
    callsFor: (path: string) => requests.filter((r) => r.url.includes(path)),
  };
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function textResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain' },
  });
}

export function authToken(expireIn = '10000'): Record<string, string> {
  return { jwt: 'signed-jwt-token', expireIn };
}

export function defaultAuthResponder() {
  return (request: RecordedRequest) => {
    if (request.url.endsWith('/api/psp/auth')) {
      return jsonResponse(authToken());
    }
    return jsonResponse({}, 404);
  };
}
