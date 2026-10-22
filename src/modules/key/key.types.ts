export interface CreateKeyRequest {
  key: string;
  name: string;
  document: string;
}

export interface CreateKeyResponse {
  id: number;
  key: string;
  name: string;
  document: string;
}

export interface KeyPsp {
  name: string;
}

export interface GetKeyResponse {
  id: string
  key: string;
  name: string;
  document: string;
  psp: KeyPsp;
}
