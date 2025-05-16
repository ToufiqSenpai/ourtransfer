import { Global, Module } from '@nestjs/common'
import { ConfigModule as NestConfigModule } from '@nestjs/config'
import * as path from 'path'
import * as fs from 'fs'
import { z } from 'zod'
import { LogLevel } from '../common/enums/log-level.enum'
import { NodeEnv } from '../common/enums/node-env.enum'
import _ from 'lodash'

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      // cache: true,
      load: [
        (): any => {
          const env = process.env.NODE_ENV || 'development'
          const defaultConfigPath = path.resolve(__dirname, '..', '..', `app-config.json`)
          const envConfigPath = path.resolve(__dirname, '..', '..', `app-config.${env}.json`)

          let config = JSON.parse(fs.readFileSync(defaultConfigPath, 'utf-8'))

          if (fs.existsSync(envConfigPath)) {
            config = _.merge(config, JSON.parse(fs.readFileSync(envConfigPath, 'utf-8')))
          }

          const schema = z.object({
            app: z.object({
              port: z.number(),
              domain: z.string(),
              nodeEnv: z
                .nativeEnum(NodeEnv)
                .transform(() => process.env.NODE_ENV)
                .default(NodeEnv.DEVELOPMENT),
            }),
            logger: z.object({
              level: z.nativeEnum(LogLevel),
              file: z.object({
                enabled: z.boolean(),
                outputPath: z.string(),
              }),
            }),
            database: z.object({
              type: z.enum(['postgres', 'mysql', 'sqlite', 'mariadb', 'mssql']),
              ssl: z.boolean(),
            }),
          })

          return schema.parse(config)
        },
      ],
    }),
  ],
})
export class ConfigModule {}
