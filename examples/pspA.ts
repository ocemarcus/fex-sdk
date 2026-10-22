import {FexSdk, TransferStatus} from '@fex/sdk'
import { PSPA_SECRET } from './secret/pspA'
import Fastify from 'fastify'
import { setTimeout } from 'timers/promises';
import { EventsNotificationType } from '@fex/sdk/client/types';


const fastify = Fastify({
  logger: true
})

fastify.addHook('preHandler', function (req, reply, done) {
    this.fexSdk =  new FexSdk({
      apiKey: PSPA_SECRET.apiKey,
      privateKey: PSPA_SECRET.privateKey,
    })
    done()
})

fastify.post('/webhook', async function  (request, reply) {

   reply.send('ok')

   if(request.body.eventType === EventsNotificationType.TRANSFER_IN) {

      await this.fexSdk.ackTransfer(request.body.transferId, {reason: 'ok', status: TransferStatus.OK})
      return 
    }
    console.log(request.body)
    
})

fastify.get('/', async function (request, reply) {

    reply.send('ok')

    const key = await this.fexSdk.getKey('+5581563974010')

    function getRandomAmount(min, max) {
     return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    for(let i=0; i < 200; i++) {

      const amount = getRandomAmount(10,20000)

      const transfer =  await this.fexSdk.sendTransfer({
        amount,
        keyId: key.id,
        holder: {
          name: 'Marcus',
          document: '131313131'
        }
      })
      console.log(transfer)
      await setTimeout(200)
    }
 
})

// Run the server!
fastify.listen({ port: 3003 }, function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  // Server is now listening on ${address}
})