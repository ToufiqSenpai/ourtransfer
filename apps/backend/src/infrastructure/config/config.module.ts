import { Global, Module } from "@nestjs/common"
import { ConfigModule as NestConfigModule } from "@nestjs/config"
import * as path from "path"
import * as fs from "fs"
import * as _ from "lodash"

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      // cache: true,
      load: [
        (): any => {
          const env = process.env.NODE_ENV || "development"
          const defaultConfigPath = path.resolve(__dirname, `app-config.json`)
          const envConfigPath = path.resolve(__dirname, `app-config.${env}.json`)

          let config = JSON.parse(fs.readFileSync(defaultConfigPath, "utf-8"))

          if (fs.existsSync(envConfigPath)) {
            config = _.merge(config, JSON.parse(fs.readFileSync(envConfigPath, "utf-8")))
          }

          return _.merge(config, { app: { nodeEnv: env } })
        },
      ],
    }),
  ],
})
export class ConfigModule {}
