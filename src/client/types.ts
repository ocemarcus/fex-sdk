export interface FexSdkConfig {
  apiKey: string;
  privateKey: string;
  timeout?: number;
}

export type HttpMethod = 'GET' | 'POST' | 'PATCH';

export interface HttpClientOptions {
  baseUrl: string;
  apiKey: string;
  rsa: string;
  timeout: number;
}

export interface RequestOptions {
  method: HttpMethod;
  path: string;
  body?: unknown;
  authenticated?: boolean;
}

export interface HttpResponse<T = unknown> {
  status: number;
  data: T;
}
export enum EventsNotificationType {
    TRANSFER_IN = 'TRANSFER_IN',
    TRANSFER_ASK = 'TRANSFER_ASK',
    KEY_BLOCK = 'KEY_BLOCK',
} 