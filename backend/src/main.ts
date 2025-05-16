import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { INestApplication, VersioningType } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Logger, LOGGER } from './common/interfaces/logger.interface'
import { ZodExceptionFilter } from './shared/filters/zod-exception.filter'

export class Main {
  private static app: INestApplication
  private static readonly isMain = require.main === module

  public static async main(): Promise<void> {
    if (this.isMain) {
      await this.getAppInstance()
    }
  }

  public static async getAppInstance<T>(): Promise<INestApplication<T>> {
    if (!this.app) {
      this.app = await NestFactory.create(AppModule, {
        // logger: false,
      })
      const config = this.app.get(ConfigService)
      const PORT = config.get<number>('app.port', 3000)
      const logger = await this.app.resolve<Logger>(LOGGER)

      this.app.useLogger(logger)
      this.app.useGlobalFilters(new ZodExceptionFilter())
      this.app.setGlobalPrefix('api')

      const swaggerConfig = new DocumentBuilder()
        .setTitle('OurTransfer API')
        .setDescription('API documentation for OurTransfer')
        .setVersion('1.0')
        .build()
      const document = SwaggerModule.createDocument(this.app, swaggerConfig)

      SwaggerModule.setup('api', this.app, document)

      this.app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' })

      if (this.isMain) {
        await this.app.listen(PORT, () => logger.info(`Server is running on port ${PORT}`))
      } else {
        await this.app.init()
      }
    }

    return this.app
  }
}
Main.main()
