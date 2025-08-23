import React from "react"
import { Processor, WorkerHost } from "@nestjs/bullmq"
import { Job } from "bullmq"
import { render } from "@react-email/render"
import { Logger } from "../log/logger.abstract"
import { Resend } from "resend"
import { ConfigService } from "@nestjs/config"
import PasswordResetTemplate from "./templates/password-reset.template"
import LoginVerificationCodeTemplate from "./templates/login-verification-code.template"

export const EMAIL_QUEUE = "email"

export interface EmailConsumerData {
  to: string
  subject: string
  payload: Record<string, any>
}

@Processor(EMAIL_QUEUE)
export class EmailConsumer extends WorkerHost {
  private readonly templates = new Map<string, (props: any) => React.ReactElement>()

  public constructor(
    private readonly logger: Logger,
    private readonly resend: Resend,
    private readonly config: ConfigService,
  ) {
    super()

    this.templates.set("login-verification-code", LoginVerificationCodeTemplate)
    this.templates.set("password-reset", PasswordResetTemplate)
  }

  public async process(job: Job<EmailConsumerData>): Promise<void> {
    const html = await this.getHtmlTemplate(job.name, job.data.payload)

    await this.resend.emails.send({
      from: this.config.getOrThrow<string>("email.from"),
      to: job.data.to,
      subject: job.data.subject,
      html
    })
  }

  private async getHtmlTemplate(template: string, data: any): Promise<string> {
    const Template = this.templates.get(template)

    if (!Template) {
      this.logger.error(`Template not found: ${template}`)

      throw new Error(`Template not found: ${template}`)
    }

    return render(<Template {...data} />)
  }
}
