import { Controller, Post, Get, Body } from '@nestjs/common'
import { CreateTransferDto } from '../dtos/create-transfer.dto'

@Controller({ path: 'transfers', version: '1' })
export class TransferController {
  @Post()
  public async createTransfer(@Body() dto: CreateTransferDto) {}

  @Get()
  public async getTransfers() {}

  @Get(':transferId')
  public async getTransfer() {}

  @Get(':transferId/finalize')
  public async finalizeTransfer() {}

  @Get(':transferId/prepare-download')
  public async prepareDownload() {}

  @Get(':transferId/download')
  public async downloadFile() {}

  @Post(':transferId/files/:fileId/:partId')
  public async uploadPart() {}
}
