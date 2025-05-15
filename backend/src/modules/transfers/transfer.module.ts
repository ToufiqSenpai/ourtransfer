import { Module } from '@nestjs/common'
import { TransferController } from './controllers/transfer.controller'

@Module({
  controllers: [TransferController],
})
export class TransferModule {}
