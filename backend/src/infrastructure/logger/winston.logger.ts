import { Inject, Injectable, Scope } from '@nestjs/common'
import { Logger } from '../../common/interfaces/logger.interface'
import winston, { format, transports, createLogger } from 'winston'
import { LoggerConfig } from '../../configs/logger.config'
import { INQUIRER } from '@nestjs/core'
import { LogLevel } from '../../common/enums/log-level.enum'

@Injectable({ scope: Scope.TRANSIENT })
export class WinstonLogger implements Logger {
  private logger: winston.Logger

  public constructor(
    private readonly config: LoggerConfig,
    @Inject(INQUIRER) parentClass: object,
  ) {
    this.logger = createLogger({
      levels: Object.values(LogLevel).reduce(
        (acc, key, index) => {
          acc[key] = index
          return acc
        },
        {} as Record<string, number>,
      ),
      level: config.level,
      transports: [
        new transports.Console({
          format: format.combine(
            format.timestamp(),
            format.printf(
              ({ timestamp, level, message }) =>
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                `[${level.toUpperCase()}] [${parentClass?.constructor.name}] ${timestamp} - ${message as string}`,
            ),
          ),
        }),
      ],
    })

    if (this.config.isFileLoggingEnabled) {
      this.logger.add(
        new transports.File({
          filename: this.config.fileOutputPath,
          level: this.config.level,
          format: format.json(),
        }),
      )
    }
  }

  public trace(message: string, ...args: any[]): void {
    this.logger.log(LogLevel.TRACE, message, ...args)
  }

  public debug(message: string, ...args: any[]): void {
    this.logger.log(LogLevel.DEBUG, message, ...args)
  }

  public verbose(message: string, ...args: any[]): void {
    this.logger.log(LogLevel.VERBOSE, message, ...args)
  }

  public info(message: string, ...args: any[]): void {
    this.logger.log(LogLevel.INFO, message, ...args)
  }

  public log(message: string, ...args) {
    this.logger.log(LogLevel.INFO, message, ...args)
  }

  public warn(message: string, ...args: any[]): void {
    this.logger.log(LogLevel.WARN, message, ...args)
  }

  public error(message: string, ...args: any[]): void {
    this.logger.log(LogLevel.ERROR, message, ...args)
  }

  public fatal(message: string, ...args: any[]): void {
    this.logger.log(LogLevel.FATAL, message, ...args)
  }
}
