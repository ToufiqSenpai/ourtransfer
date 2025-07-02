import { Global, Module } from '@nestjs/common'
import { EMAIL } from '../../common/interfaces/email/email.interface'
import { ResendEmail } from './resend.email'
import { Resend } from 'resend'
import { SecretManager } from '../../common/abstracts/secret/secret-manager.abstract'
import { BullModule } from '@nestjs/bullmq'
import { EmailConsumer } from './consumers/email.consumer'

@Global()
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'email',
    }),
  ],
  providers: [
    {
      provide: EMAIL,
      useClass: ResendEmail,
    },
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
  ],
})
export class EmailModule {}
