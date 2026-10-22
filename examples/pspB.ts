import Fastify from 'fastify'
import {FexSdk, TransferStatus} from '@fex/sdk'
import { PSPB_SECRET } from './secret/pspB'
import { EventsNotificationType } from '@fex/sdk/client/types'
import { setTimeout } from 'timers/promises';


const fastify = Fastify({
  logger: true
})

fastify.addHook('preHandler', function (req, reply, done) {
    this.fexSdk = new FexSdk({
      apiKey: PSPB_SECRET.apiKey,
      privateKey: PSPB_SECRET.privateKey,
    })
    done()
})

// Declare a route
fastify.post('/webhook', async function  (request, reply) {
    
    //reply.send('ok')
    console.log(request.body)

    if(request.body.eventType === EventsNotificationType.TRANSFER_IN) {

      await this.fexSdk.ackTransfer(request.body.transferId, {reason: 'ok', status: TransferStatus.OK})
      return
    }
    console.log(request.body)
})

fastify.get('/',  async function (request, reply) {

    reply.send('ok')

    const key = await this.fexSdk.getKey('+55223345432133')

    function getRandomAmount(min, max) {
     return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    for(let i=0; i < 10; i++) {

      const amount = getRandomAmount(10,20000)

      const transfer =  await this.fexSdk.sendTransfer({
        amount,
        keyId: key.id,
        holder: {
          name: 'Jose Carlos',
          document: '131313131'
        }
      })
      console.log(transfer)
      await setTimeout(200)
    }
 
})

// Run the server!
fastify.listen({ port: 3002 }, function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  // Server is now listening on ${address}
})