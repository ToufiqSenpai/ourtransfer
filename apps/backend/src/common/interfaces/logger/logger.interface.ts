export const LOGGER = Symbol('LOGGER')

export interface Logger {
  trace(message: string, ...args: any[]): void
  debug(message: string, ...args: any[]): void
  verbose(message: string, ...args: any[]): void
  info(message: string, ...args: any[]): void
  log(message: string, ...args: any[]): void
  warn(message: string, ...args: any[]): void
  error(message: string, ...args: any[]): void
  fatal(message: string, ...args: any[]): void
}
