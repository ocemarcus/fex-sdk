import { FexClient } from './client/fex-client.js';
import { FexError } from './client/fex-error.js';
import type { FexSdkConfig } from './client/types.js';
import { assertNonEmpty } from './client/validation.js';
import { KeyService } from './modules/key/key.service.js';
import type {
  CreateKeyRequest,
  CreateKeyResponse,
  GetKeyResponse,
} from './modules/key/key.types.js';
import { PspService } from './modules/psp/psp.service.js';
import type { PspAuthRequest, PspAuthResponse } from './modules/psp/psp.types.js';
import { TransferService } from './modules/transfer/transfer.service.js';
import {
  type AckTransferRequest,
  type DetailTransferResponse,
  type SendTransferRequest,
  type SendTransferResponse,
  TransferStatus,
} from './modules/transfer/transfer.types.js';

const DEFAULT_TIMEOUT_MS = 10_000;

export class FexSdk {
  private readonly client: FexClient;
  private readonly psp: PspService;
  private readonly transfer: TransferService;
  private readonly key: KeyService;

  constructor(config: FexSdkConfig) {
    assertNonEmpty(config.apiKey, 'apiKey');
    assertNonEmpty(config.privateKey, 'privateKey');

    const baseUrl = 'http://localhost:3086'
    const timeout = config.timeout ?? DEFAULT_TIMEOUT_MS;

    this.client = new FexClient({ baseUrl, apiKey: config.apiKey, rsa: config.privateKey, timeout });
    this.psp = new PspService(this.client, {
      apiKey: config.apiKey,
      privateKey: config.privateKey,
    });
    this.client.setAuthenticator(() => this.psp.authenticate());
    this.transfer = new TransferService(this.client);
    this.key = new KeyService(this.client);
  }

  async pspAuth(): Promise<void> {
    await this.client.authenticate();
  }

  async sendTransfer(request: SendTransferRequest): Promise<SendTransferResponse> {
    return this.transfer.sendTransfer(request);
  }

  async ackTransfer(id: string, request: AckTransferRequest): Promise<void> {
    await this.transfer.ackTransfer(id, request);
  }

  async detailTransfer(id: string): Promise<DetailTransferResponse> {
    return this.transfer.detailTransfer(id);
  }

  async createKey(request: CreateKeyRequest): Promise<CreateKeyResponse> {
    return this.key.createKey(request);
  }

  async getKey(key: string): Promise<GetKeyResponse> {
    return this.key.getKey(key);
  }
}
 

export type {
  AckTransferRequest,
  CreateKeyRequest,
  CreateKeyResponse,
  DetailTransferResponse,
  FexSdkConfig,
  GetKeyResponse,
  PspAuthRequest,
  PspAuthResponse,
  SendTransferRequest,
  SendTransferResponse,
};
export { FexError, TransferStatus };
