import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { EMAIL_QUEUE, EmailConsumerData } from './email.consumer';
import { Queue } from 'bullmq';

@Injectable()
export class EmailService {
  public constructor(
    @InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue<EmailConsumerData>,
  ) {}

  public async send(to: string, subject: string, template: EmailTemplate): Promise<void> {
    // Logic to send an email
    // This could involve using a third-party service like SendGrid, Nodemailer, etc.
    await this.emailQueue.add(template.name, {
      to,
      subject,
      payload: template.payload
    })
  }
}

export interface EmailTemplate {
  name: string
  payload: Record<string, any>
}
