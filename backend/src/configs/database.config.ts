import { BaseConfig } from '../shared/base/base.config'
import { z } from 'zod'
import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SECRET_MANAGER, SecretManager } from 'src/common/interfaces/secret-manager.interface'

@Injectable()
export class DatabaseConfig extends BaseConfig {
  public constructor(
    @Inject(SECRET_MANAGER) private readonly secretManager: SecretManager,
    private readonly configService: ConfigService,
  ) {
    super(
      Object.assign(configService.get('database'), {
        type: configService.get('database.type'),
        host: secretManager.get('DATABASE_HOST'),
        port: secretManager.get('DATABASE_PORT'),
        username: secretManager.get('DATABASE_USERNAME'),
        password: secretManager.get('DATABASE_PASSWORD'),
        database: secretManager.get('DATABASE_NAME'),
      }),
    )
  }

  protected schema(): z.Schema<any> {
    return z.object({
      type: z.enum(['mysql', 'postgres', 'sqlite']),
      host: z.string(),
      port: z.number().int().positive().min(1).max(65535),
      username: z.string(),
      password: z.string(),
      database: z.string(),
    })
  }

  public get type(): string {
    return this.configService.get<string>('database.type')!
  }

  public get host(): string {
    return this.secretManager.get('DATABASE_HOST')!
  }

  public get port(): number {
    return this.configService.get<number>('database.port')!
  }

  public get username(): string {
    return this.configService.get<string>('database.username')!
  }

  public get password(): string {
    return this.configService.get<string>('database.password')!
  }

  public get database(): string {
    return this.configService.get<string>('database.database')!
  }
}
