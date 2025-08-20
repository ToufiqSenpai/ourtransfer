import { Global, Module } from '@nestjs/common'
import { Resend } from 'resend'
import { SecretManager } from '../secret/secret-manager.abstract'
import { BullModule } from '@nestjs/bullmq'
import { EMAIL_QUEUE, EmailConsumer } from './email.consumer'
import { EmailService } from './email.service'

@Global()
@Module({
  imports: [
    BullModule.registerQueue({
      name: EMAIL_QUEUE,
    }),
  ],
  providers: [
    {
      provide: Resend,
      async useFactory(secretManager: SecretManager): Promise<Resend> {
        const apiKey = await secretManager.getOrThrow('RESEND_API_KEY')
        return new Resend(apiKey)
      },
      inject: [SecretManager],
    },
    // Consumers
    EmailConsumer,

    // Services
    EmailService
  ],
  exports: [EmailService]
})
export class EmailModule {}
