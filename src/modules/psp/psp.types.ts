export interface PspAuthRequest {
  apiKey: string;
  rsa: string;
}

export interface PspAuthResponse {
  jwt: string;
  expireIn: string;
}
