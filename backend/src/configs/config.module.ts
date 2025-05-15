import { Global, Module } from '@nestjs/common'
import { ConfigModule as NestConfigModule } from '@nestjs/config'
import * as path from 'path'
import * as fs from 'fs'
import { AppConfig } from './app.config'
import { LoggerConfig } from './logger.config'
import { DatabaseConfig } from './database.config'

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: false,
      load: [
        (): any => {
          const env = process.env.NODE_ENV || 'development'
          const configPath = path.resolve(__dirname, '..', '..', `app-config.${env}.json`)

          try {
            const file = fs.readFileSync(configPath, 'utf-8')
            return JSON.parse(file)
          } catch (error) {
            throw new Error(`Failed to load config file: ${configPath}. Error: ${(error as Error).message}`)
          }
        },
      ],
    }),
  ],
  providers: [AppConfig, LoggerConfig, DatabaseConfig],
  exports: [AppConfig, LoggerConfig, DatabaseConfig],
})
export class ConfigModule {}
