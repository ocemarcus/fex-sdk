import type { FexClient } from '../../client/fex-client.js';
import type { PspAuthResponse } from './psp.types.js';

export interface PspServiceConfig {
  apiKey: string;
  privateKey: string;
}

export class PspService {
  constructor(
    private readonly client: FexClient,
    private readonly config: PspServiceConfig,
  ) {}

  async authenticate(): Promise<void> {
    const response = await this.client.request<PspAuthResponse>({
      method: 'POST',
      path: '/api/psp/auth',
      authenticated: false,
      body: this.config,
    });

    this.client.setToken(response.jwt, response.expireIn);
  }
}
