import { Module } from "@nestjs/common"
import { CqrsModule } from "@nestjs/cqrs"
import { InfrastructureModule } from "./infrastructure/infrastructure.module"
import { AutomapperModule } from "@automapper/nestjs"
import { classes } from "@automapper/classes"

@Module({
  imports: [
    CqrsModule.forRoot(),
    AutomapperModule.forRoot({
      strategyInitializer: classes()
    }),
    InfrastructureModule
  ]
})
export class AppModule {}
