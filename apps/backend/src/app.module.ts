import { Module } from "@nestjs/common"
import { CqrsModule } from "@nestjs/cqrs"
import { InfrastructureModule } from "./infrastructure/infrastructure.module"
import { AutomapperModule } from "@automapper/nestjs"
import { classes } from "@automapper/classes"
import { HttpModule } from "@nestjs/axios"
import { UserModule } from "./modules/user/user.module"
import { AuthModule } from "./modules/auth/auth.module"

@Module({
  imports: [
    CqrsModule.forRoot(),
    AutomapperModule.forRoot({
      strategyInitializer: classes()
    }),
    HttpModule.register({
      global: true,
    }),
    InfrastructureModule,
    AuthModule,
    UserModule
  ]
})
export class AppModule {}
