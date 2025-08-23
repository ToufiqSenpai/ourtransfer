import { LogLevel } from "../../common/enums/log-level.enum"

export abstract class Logger {
  protected abstract handleLog(level: LogLevel, message: string, ...args: any[]): void

  public trace(message: string, ...args: any[]): void {
    this.handleLog(LogLevel.TRACE, message, ...args)
  }

  public debug(message: string, ...args: any[]): void {
    this.handleLog(LogLevel.DEBUG, message, ...args)
  }

  public verbose(message: string, ...args: any[]): void {
    this.handleLog(LogLevel.VERBOSE, message, ...args)
  }

  public info(message: string, ...args: any[]): void {
    this.handleLog(LogLevel.INFO, message, ...args)
  }

  public log(message: string, ...args: any[]): void {
    this.handleLog(LogLevel.INFO, message, ...args)
  }

  public warn(message: string, ...args: any[]): void {
    this.handleLog(LogLevel.WARN, message, ...args)
  }

  public error(message: string, ...args: any[]): void {
    this.handleLog(LogLevel.ERROR, message, ...args)
  }

  public fatal(message: string, ...args: any[]): void {
    this.handleLog(LogLevel.FATAL, message, ...args)
  }
}
