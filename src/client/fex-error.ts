export interface FexErrorOptions {
  status?: number;
  code?: string;
  details?: unknown;
}

export class FexError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, options: FexErrorOptions = {}) {
    super(message);

    this.name = 'FexError';
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;

    Object.setPrototypeOf(this, FexError.prototype);
  }
}

export function isHttpStatus(status: number | undefined, range: [number, number]): boolean {
  return status !== undefined && status >= range[0] && status <= range[1];
}

export function statusCodeToMessage(status: number): string {
  switch (status) {
    case 400:
      return 'Bad Request';
    case 401:
      return 'Unauthorized';
    case 403:
      return 'Forbidden';
    case 404:
      return 'Not Found';
    case 409:
      return 'Conflict';
    case 422:
      return 'Unprocessable Entity';
    case 429:
      return 'Too Many Requests';
    default:
      return `HTTP ${status}`;
  }
}

export function isTimeoutError(error: unknown): error is DOMException {
  return error instanceof DOMException && error.name === 'AbortError';
}

export function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError && error.message.includes('fetch failed');
}
