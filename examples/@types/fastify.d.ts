import type { FexSdk } from '@fex/sdk';

declare module 'fastify' {
  interface FastifyInstance {
    fexSdk: FexSdk;
  }
}