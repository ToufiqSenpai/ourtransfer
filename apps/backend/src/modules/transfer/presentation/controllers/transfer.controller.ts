import { Controller, Delete, Get, Post } from "@nestjs/common"
import {
  ApiBadRequestResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from "@nestjs/swagger"
import { CommonResponseDto, CreateTransferBadRequestDto, TransferDto } from "@ourtransfer/dto"

@Controller("/transfers")
export class TransferController {
  @Post()
  @ApiOperation({})
  @ApiOkResponse({ type: TransferDto })
  @ApiBadRequestResponse({ type: CreateTransferBadRequestDto })
  public async createTransfer(): Promise<TransferDto> {
    return new TransferDto()
  }

  @Get("/:transferId")
  @ApiOperation({})
  @ApiOkResponse({ type: TransferDto })
  @ApiNotFoundResponse({ type: CommonResponseDto })
  public async getTransfer(): Promise<TransferDto> {
    return new TransferDto()
  }

  @Delete("/:transferId")
  @ApiOperation({})
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: CommonResponseDto })
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public async deleteTransfer(): Promise<void> {

  }
}
