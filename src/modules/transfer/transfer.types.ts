export enum TransferStatus {
  OK = 'OK',
  REJECT = 'REJECT',
}

export interface SendTransferRequest {
  amount: number;
  keyId: string;
  holder: {
     name: string
     document: string
  }
}

export interface SendTransferResponse {
  id: string;
  amount: number;
  key: string;
}

export interface AckTransferRequest {
  status: TransferStatus;
  reason: string;
}

export interface TransferHolder {
  name: string;
  document: string;
}

export interface TransferParticipant {
  bank: string;
  holder?: TransferHolder;
}

export interface DetailTransferResponse {
  id: number;
  amount: number;
  key: string;
  payer: TransferParticipant;
  payee: TransferParticipant;
}
