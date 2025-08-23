import { VersioningType } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { NestFactory, HttpAdapterHost } from "@nestjs/core"
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger"
import { AppModule } from "./app.module"
import { Logger } from "./infrastructure/log/logger.abstract"
import { AllExceptionFilter } from "./common/filters/all-exception.filter"
import { ZodExceptionFilter } from "./common/filters/zod-exception.filter"
import { json } from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  })

  const logger = await app.resolve<Logger>(Logger)
  const config = app.get(ConfigService)
  const httpAdapter = app.get(HttpAdapterHost)
  const domain = config.get<string>("app.domain")
  const port = config.getOrThrow<number>("app.port")

  app.use(json({ limit: "10mb", type: ["application/json"] }))

  app.use(
    cors({
      origin: config.get<string>("client.web.url"),
      credentials: true,
    }),
  )
  app.use(cookieParser())
  app.useLogger(logger)
  app.useGlobalFilters(new AllExceptionFilter(httpAdapter), new ZodExceptionFilter())
  app.setGlobalPrefix("api")

  app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" })

  const swaggerConfig = new DocumentBuilder()
    .setTitle("OurTransfer API")
    .setDescription("API documentation for OurTransfer")
    .setVersion("1.0")
    .build()
  const document = SwaggerModule.createDocument(app, swaggerConfig)

  SwaggerModule.setup("api", app, document)

  await app.listen(port, () => {
    logger.info(`Server is running at http://${domain}:${port}/api`)
  })
}

bootstrap()
