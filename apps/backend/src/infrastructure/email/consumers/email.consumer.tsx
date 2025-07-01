import React from "react"
import { WorkerHost } from "@nestjs/bullmq"
import { Job } from "bullmq"
import { render } from "@react-email/render"
import { resolve } from "path"
import { Logger } from "../../../common/interfaces/logger/logger.interface"
import { Email } from "../../../common/interfaces/email/email.interface"
import { plainToInstance } from "class-transformer"

export const EMAIL_QUEUE = "email"

export class EmailConsumerData<D = Record<string, any>> {
  public to: string
  public subject?: string = "Default Subject"
  public text?: string = ""
  public htmlData?: D
}

export class EmailConsumer extends WorkerHost {
  public constructor(protected readonly logger: Logger, private readonly email: Email) {
    super()
  }

  public async process(job: Job<EmailConsumerData>, token?: string): Promise<void> {
    const { to, subject, text, htmlData } = plainToInstance(EmailConsumerData, job.data)
    const html = await this.getHtmlTemplate(job.name, htmlData)

    await this.email.send(to, subject!, text!, html)
  }

  private async getHtmlTemplate(template: string, data: any): Promise<string> {
    const templatePath = resolve(__dirname, "..", "templates", `${template}.template.tsx`)
    const { default: Template } = await import(templatePath)

    if (!Template) {
      throw new Error(`Template not found: ${templatePath}`)
    }

    return render(<Template {...data} />)
  }
}
