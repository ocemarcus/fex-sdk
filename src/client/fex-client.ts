import { FexError, isHttpStatus, statusCodeToMessage } from './fex-error.js';
import type { HttpClientOptions, RequestOptions } from './types.js';
import { assertNonEmpty } from './validation.js';

const DEFAULT_REFRESH_MARGIN_MS = 5_000;

export type TokenAuthenticator = () => Promise<void>;

export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export class FexClient {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly fetchImpl: FetchLike;

  private jwt?: string;
  private jwtExpiresAt?: number;
  private authenticationPromise?: Promise<void>;
  private authenticator?: TokenAuthenticator;

  constructor(options: HttpClientOptions, fetchImpl?: FetchLike) {
    this.baseUrl = options.baseUrl;
    this.timeout = options.timeout;
    this.fetchImpl = fetchImpl ?? ((input, init) => fetch(input, init));
  }

  setAuthenticator(authenticator: TokenAuthenticator): void {
    this.authenticator = authenticator;
  }

  setToken(jwt: string, expireInMs?: string | number): void {
    assertNonEmpty(jwt, 'jwt');
    this.jwt = jwt;

    const parsed = Number(expireInMs);
    this.jwtExpiresAt = Number.isFinite(parsed) && parsed > 0 ? Date.now() + parsed : undefined;
  }

  async authenticate(): Promise<void> {
    if (this.hasValidJwt()) {
      return;
    }

    const pending = this.authenticationPromise ?? this.performAuthentication();
    this.authenticationPromise = pending;

    try {
      await pending;
    } finally {
      if (this.authenticationPromise === pending) {
        this.authenticationPromise = undefined;
      }
    }
  }

  async request<T>(options: RequestOptions): Promise<T> {
    if (options.authenticated) {
      await this.authenticate();
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    const headers = new Headers({
      Accept: 'application/json',
      'Content-Type': 'application/json',
    });

    if (options.authenticated && this.jwt) {
      headers.set('Authorization', `Bearer ${this.jwt}`);
    }

    const init: RequestInit = {
      method: options.method,
      headers,
      signal: controller.signal,
    };

    if (options.body !== undefined) {
      init.body = JSON.stringify(options.body);
    }

    let response: Response;
    try {
      response = await this.fetchImpl(this.buildUrl(options.path), init);
    } catch (error) {
      clearTimeout(timeoutId);
      throw this.toRequestError(error);
    }
    clearTimeout(timeoutId);

    return this.handleResponse<T>(response);
  }

  private hasValidJwt(): boolean {
    if (!this.jwt) {
      return false;
    }
    if (this.jwtExpiresAt === undefined) {
      return true;
    }
    return this.jwtExpiresAt > Date.now() + DEFAULT_REFRESH_MARGIN_MS;
  }

  private async performAuthentication(): Promise<void> {
    if (!this.authenticator) {
      throw new FexError('The SDK is not configured to authenticate', {
        code: 'AUTH_NOT_CONFIGURED',
      });
    }
    await this.authenticator();
  }

  private buildUrl(path: string): string {
    if (!path.startsWith('/')) {
      throw new FexError('Request path must start with "/"', {
        code: 'INVALID_PATH',
      });
    }
    return `${this.baseUrl}${path}`;
  }

  private toRequestError(error: unknown): FexError {
    if (error instanceof FexError) {
      return error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      return new FexError(`Request timed out after ${this.timeout}ms`, {
        code: 'TIMEOUT',
      });
    }

    if (this.isNetworkError(error)) {
      return new FexError('Connection error while reaching the Fex API', {
        code: 'CONNECTION_ERROR',
      });
    }

    return new FexError('Unexpected error while performing the request', {
      code: 'REQUEST_FAILED',
    });
  }

  private isNetworkError(error: unknown): boolean {
    return (
      error instanceof TypeError &&
      (error.message === 'fetch failed' || error.message.includes('fetch'))
    );
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const text = await response.text();
    const data = this.parseBody(text);

    if (!response.ok) {
      throw this.toHttpError(response.status, data);
    }

    return data as T;
  }

  private parseBody(text: string): unknown {
    if (text === '') {
      return undefined;
    }
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }

  private toHttpError(status: number, details: unknown): FexError {
    const message = extractErrorMessage(details) || statusCodeToMessage(status);
    const isServerError = isHttpStatus(status, [500, 599]);

    return new FexError(message, {
      status,
      code: isServerError ? 'SERVER_ERROR' : `HTTP_${status}`,
      details,
    });
  }
}

function extractErrorMessage(details: unknown): string {
  if (typeof details === 'string') {
    return details;
  }

  if (details !== null && typeof details === 'object') {
    const record = details as Record<string, unknown>;
    for (const field of ['message', 'error', 'detail', 'title'] as const) {
      const value = record[field];
      if (typeof value === 'string') {
        return value;
      }
    }
  }

  return '';
}
