import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { VersioningType } from '@nestjs/common'
import { AppConfig } from './configs/app.config'
import { Logger, LOGGER } from './common/interfaces/logger.interface'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // logger: false
  })
  const logger = await app.resolve<Logger>(LOGGER)
  const appConfig = app.get(AppConfig)

  app.useLogger(logger)
  app.setGlobalPrefix('api')

  const swaggerConfig = new DocumentBuilder()
    .setTitle('OurTransfer API')
    .setDescription('API documentation for OurTransfer')
    .setVersion('1.0')
    .build()
  const document = SwaggerModule.createDocument(app, swaggerConfig)

  SwaggerModule.setup('api', app, document)

  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' })

  await app.listen(appConfig.port, () => logger.info(`Server is running on port ${appConfig.port}`))
}
bootstrap()
