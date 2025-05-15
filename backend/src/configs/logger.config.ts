import { LogLevel } from '../common/enums/log-level.enum'
import { BaseConfig } from '../shared/base/base.config'
import { z } from 'zod'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class LoggerConfig extends BaseConfig {
  public constructor(configService: ConfigService) {
    super(configService)
  }

  protected configKey(): string {
    return 'logger'
  }

  protected schema(): z.Schema<any> {
    return z.object({
      level: z.nativeEnum(LogLevel),
      file: z.object({
        enabled: z.boolean(),
        outputPath: z.string().refine(path => {
          const forbiddenWindowsChars = /[<>:"|?*]/g
          return typeof path === 'string' && !forbiddenWindowsChars.test(path) && !path.includes('\0')
        }, 'Invalid file path'),
      }),
    })
  }

  public get level(): LogLevel {
    return this.configService.get<LogLevel>('logger.level')!
  }

  public get isFileLoggingEnabled(): boolean {
    return this.configService.get<boolean>('logger.file.enabled')!
  }

  public get fileOutputPath(): string {
    return this.configService.get<string>('logger.file.outputPath')!
  }
}
