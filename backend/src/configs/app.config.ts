import { NodeEnv } from '../common/enums/node-env.enum'
import { ConfigService } from '@nestjs/config'
import { z, ZodType } from 'zod'
import { Injectable } from '@nestjs/common'
import { BaseConfig } from '../shared/base/base.config'

@Injectable()
export class AppConfig extends BaseConfig {
  public constructor(configService: ConfigService) {
    super(configService)
  }

  public schema(): ZodType<any> {
    return z.object({
      port: z.number().min(1).max(65535),
      nodeEnv: z.nativeEnum(NodeEnv).default(NodeEnv.DEVELOPMENT),
    })
  }

  public configKey(): string {
    return 'app'
  }

  public get port(): number {
    return this.configService.get<number>('app.port')!
  }

  public get nodeEnv(): NodeEnv {
    return process.env.NODE_ENV as NodeEnv
  }
}
