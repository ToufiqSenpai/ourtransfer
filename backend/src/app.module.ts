import { Module } from '@nestjs/common'
import { UserModule } from './modules/user/user.module'
import { AuthModule } from './modules/auth/auth.module'
import { TransferModule } from './modules/transfers/transfer.module'
import { ConfigModule } from './configs/config.module'
import { InfrastructureModule } from './infrastructure/infrastructure.module'
import { SharedModule } from './shared/shared.module'
import { CqrsModule } from '@nestjs/cqrs'

@Module({
  imports: [
    UserModule,
    AuthModule,
    TransferModule,
    InfrastructureModule,
    ConfigModule,
    SharedModule,
    CqrsModule.forRoot(),
  ],
  // controllers: [AppController],
  // providers: [AppService],
})
export class AppModule { }
