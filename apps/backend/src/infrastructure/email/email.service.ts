import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailService {
  public async sendEmail(to: string, subject: string, template: EmailTemplate): Promise<void> {
    // Logic to send an email
    // This could involve using a third-party service like SendGrid, Nodemailer, etc.]
  }
}

export interface EmailTemplate {
  name: string
  payload: Record<string, any>
}
