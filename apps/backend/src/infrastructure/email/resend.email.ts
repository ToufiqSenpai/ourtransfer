import { Email } from "../../common/interfaces/email/email.interface"
import { Resend } from "resend"
import { ConfigService } from "@nestjs/config"

export class ResendEmail implements Email {
  public constructor(private readonly resend: Resend, private readonly config: ConfigService) {}

  public async send(to: string, subject: string, text: string, html?: string): Promise<void> {
    await this.resend.emails.send({
      from: this.config.get("email.sender", "onboarding@resend.dev"),
      to,
      subject,
      text,
      html,
    })
  }
}
