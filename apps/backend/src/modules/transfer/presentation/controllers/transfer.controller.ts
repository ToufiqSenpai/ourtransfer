import { Controller, Post } from "@nestjs/common"
import { ApiOperation } from "@nestjs/swagger"

@Controller("/transfers")
export class TransferController {
  @Post()
  @ApiOperation()
  public async createTransfer(): Promise<void> {}
}
