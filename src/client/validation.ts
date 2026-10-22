import { FexError } from '../client/fex-error.js';

export function assertNonEmpty(value: string, field: string): void {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new FexError(`${field} must be a non-empty string`);
  }
}

export function assertValidBaseUrl(value: string): void {
  assertNonEmpty(value, 'baseUrl');

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new FexError('baseUrl must be a valid URL');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new FexError('baseUrl must use http or https protocol');
  }
}

export function assertPositiveNumber(value: number, field: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new FexError(`${field} must be a positive number`);
  }
}

export function assertNonEmptyId(value: string | number, field: string): void {
  const isEmptyNumber = typeof value === 'number' && (!Number.isFinite(value) || value <= 0);
  const isEmptyString = typeof value === 'string' && value.trim() === '';
  if (isEmptyNumber || isEmptyString) {
    throw new FexError(`${field} must be a non-empty id`);
  }
}
