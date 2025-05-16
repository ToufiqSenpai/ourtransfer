import { Module } from '@nestjs/common'
import { UserModule } from './modules/user/user.module'
import { AuthModule } from './modules/auth/auth.module'
import { TransferModule } from './modules/transfers/transfer.module'
import { ConfigModule } from './configs/config.module'
import { InfrastructureModule } from './infrastructure/infrastructure.module'
import { SharedModule } from './shared/shared.module'
import { CqrsModule } from '@nestjs/cqrs'
import { AutomapperModule } from '@automapper/nestjs'
import { classes } from '@automapper/classes'

@Module({
  imports: [
    UserModule,
    AuthModule,
    TransferModule,
    InfrastructureModule,
    ConfigModule,
    SharedModule,
    CqrsModule.forRoot(),
    AutomapperModule.forRoot({
      strategyInitializer: classes(),
    }),
  ],
  // controllers: [AppController],
  // providers: [AppService],
})
export class AppModule {}
