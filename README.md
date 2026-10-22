# Fex SDK

Official TypeScript SDK for the [Fex PSP](https://api.fex.com) API.

The SDK wraps the Fex PSP HTTP API behind a small, strongly typed and secure
surface. It handles authentication, JWT renewal and HTTP plumbing for you, so
you only deal with domain operations:

- PSP authentication (automatic)
- Send, approve, reject and inspect transfers
- Create and inspect keys

## Features

- Zero runtime dependencies (uses native `fetch`)
- Full TypeScript typings
- Automatic JWT management (reuse, renewal, shared in-flight authentication)
- Typed errors (`FexError`) with status and code
- Configurable request timeout with `AbortController`
- ESM, compatible with Node.js 20+
- Credentials and JWT are never logged or exposed in errors

## Installation

```bash
npm install @fex/sdk
```

## Initialization

```typescript
import { FexSdk } from '@fex/sdk';

const fex = new FexSdk({
  baseUrl: 'https://api.fex.com',
  apiKey: process.env.FEX_API_KEY!,
  rsa: process.env.FEX_RSA!,
});
```

| Option    | Type     | Required | Default  | Description                  |
| --------- | -------- | -------- | -------- | ---------------------------- |
| `baseUrl` | `string` | yes      | —        | Base URL of the Fex API      |
| `apiKey`  | `string` | yes      | —        | PSP API key (uuidv7)         |
| `rsa`     | `string` | yes      | —        | RSA key (base64)             |
| `timeout` | `number` | no       | `10000`  | Request timeout in ms        |

## Authentication

Authentication is automatic. You may call `pspAuth()` explicitly, but it is
also triggered lazily by the first authenticated request.

```typescript
await fex.pspAuth();
```

The JWT is kept **in memory only**, is added to every authenticated request as
`Authorization: Bearer <jwt>`, and is renewed automatically when it expires.
Concurrent requests share a single authentication call while the token is
missing or expired.

```typescript
// All of these are authenticated automatically.
await fex.sendTransfer({ amount: 1000, keyId: 12112121 });
await fex.detailTransfer('12313');
await fex.getKey(213131);
```

## Transfers

### Send a transfer

```typescript
const transfer = await fex.sendTransfer({
  amount: 1000,
  keyId: 12112121,
});
// { id: '…', amount: 1000, key: '…' }
```

### Approve a transfer

```typescript
import { TransferStatus } from '@fex/sdk';

await fex.ackTransfer(transfer.id, {
  status: TransferStatus.OK,
  reason: 'ok',
});
```

### Reject a transfer

```typescript
await fex.ackTransfer(transfer.id, {
  status: TransferStatus.REJECT,
  reason: 'invalid key',
});
```

### Inspect a transfer

```typescript
const detail = await fex.detailTransfer('12313');
// {
//   id: 12313,
//   amount: 1000,
//   key: '+5531989292700',
//   payer: { bank: 'PSP A' },
//   payee: { bank: 'PSP B', holder: { name: 'Marcus', document: '22434332' } },
// }
```

## Keys

### Create a key

```typescript
const key = await fex.createKey({
  key: '+5531989292700',
  name: 'Marcus',
  document: '22434332',
});
// { id: 1, key: '…', name: 'Marcus', document: '22434332' }
```

### Fetch a key

```typescript
const key = await fex.getKey(213131);
// { key: '…', name: 'Marcus', document: '22434332', psp: { name: 'PSP B' } }
```

## Error handling

All errors thrown by the SDK are instances of `FexError`:

```typescript
import { FexError } from '@fex/sdk';

try {
  await fex.sendTransfer({ amount: 1000, keyId: 12112121 });
} catch (error) {
  if (error instanceof FexError) {
    console.error(error.message);   // Human-readable message
    console.error(error.status);    // HTTP status, when available (e.g. 422)
    console.error(error.code);      // Machine-readable code (e.g. 'HTTP_422')
    console.error(error.details);   // Response body, when available
  }
}
```

Codes:

| Scenario                 | `status` | `code`             |
| ------------------------ | -------- | ------------------ |
| HTTP 4xx                 | e.g. `400` | `HTTP_400`       |
| HTTP 5xx                 | e.g. `500` | `SERVER_ERROR`   |
| Timeout                  | —        | `TIMEOUT`          |
| Connection error         | —        | `CONNECTION_ERROR` |

## Environment variables

```env
FEX_API_KEY=
FEX_RSA=
FEX_BASE_URL=
```

```typescript
const fex = new FexSdk({
  baseUrl: process.env.FEX_BASE_URL!,
  apiKey: process.env.FEX_API_KEY!,
  rsa: process.env.FEX_RSA!,
});
```

## TypeScript

The SDK ships with complete typings and requires no additional `@types`
package. All request and response shapes are exported as types:

```typescript
import type {
  FexSdkConfig,
  PspAuthRequest,
  PspAuthResponse,
  SendTransferRequest,
  SendTransferResponse,
  AckTransferRequest,
  DetailTransferResponse,
  CreateKeyRequest,
  CreateKeyResponse,
  GetKeyResponse,
} from '@fex/sdk';
```

## Security

- Credentials (`apiKey`, `rsa`) and the JWT are kept in memory only.
- The SDK never logs credentials or tokens.
- Credentials never appear in URLs, query strings, or error messages.
- Use environment variables (or a secrets manager) to store credentials.

## License

[MIT](./LICENSE)
