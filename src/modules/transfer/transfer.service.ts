import type { FexClient } from '../../client/fex-client.js';
import { assertNonEmptyId, assertPositiveNumber } from '../../client/validation.js';
import type {
  AckTransferRequest,
  DetailTransferResponse,
  SendTransferRequest,
  SendTransferResponse,
} from './transfer.types.js';

export class TransferService {
  constructor(private readonly client: FexClient) {}

  async sendTransfer(request: SendTransferRequest): Promise<SendTransferResponse> {
    assertPositiveNumber(request.amount, 'amount');

    return this.client.request<SendTransferResponse>({
      method: 'POST',
      path: '/api/psp/transfer',
      authenticated: true,
      body: request,
    });
  }

  async ackTransfer(id: string, request: AckTransferRequest): Promise<void> {
    assertNonEmptyId(id, 'id');

    await this.client.request<unknown>({
      method: 'PATCH',
      path: `/api/psp/transfer/ack`,
      authenticated: true,
      body: {id, ...request},
    });
  }

  async detailTransfer(id: string): Promise<DetailTransferResponse> {
    assertNonEmptyId(id, 'id');

    return this.client.request<DetailTransferResponse>({
      method: 'GET',
      path: `/api/psp/transfer/${encodeURIComponent(id)}`,
      authenticated: true,
    });
  }
}
