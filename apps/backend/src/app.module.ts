import { Module } from "@nestjs/common"
import { CqrsModule } from "@nestjs/cqrs"
import { InfrastructureModule } from "./infrastructure/infrastructure.module"

@Module({
  imports: [
    CqrsModule.forRoot(),
    InfrastructureModule
  ]
})
export class AppModule {}
