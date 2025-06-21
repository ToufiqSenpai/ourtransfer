export const EMAIL = Symbol('Email')

export interface Email {
  send(to: string, subject: string, body: string, html?: string): Promise<void>
}
