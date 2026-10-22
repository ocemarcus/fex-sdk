import type { FexClient } from '../../client/fex-client.js';
import { assertNonEmpty, assertNonEmptyId } from '../../client/validation.js';
import type { CreateKeyRequest, CreateKeyResponse, GetKeyResponse } from './key.types.js';

export class KeyService {
  constructor(private readonly client: FexClient) {}

  async createKey(request: CreateKeyRequest): Promise<CreateKeyResponse> {
    assertNonEmpty(request.key, 'key');
    assertNonEmpty(request.name, 'name');
    assertNonEmpty(request.document, 'document');

    return this.client.request<CreateKeyResponse>({
      method: 'POST',
      path: '/api/psp/key',
      authenticated: true,
      body: request,
    });
  }

  async getKey(key: string): Promise<GetKeyResponse> {
    assertNonEmptyId(key, 'key');

    return this.client.request<GetKeyResponse>({
      method: 'GET',
      path: `/api/psp/key/${encodeURIComponent(String(key))}`,
      authenticated: true,
    });
  }
}
