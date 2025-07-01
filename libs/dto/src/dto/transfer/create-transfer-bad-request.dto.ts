import { BaseBadRequestDto } from '../common/base-bad-request.dto';

class CreateTransferBadRequestErrors {
  public title: string[]
  public message: string[]
  public emailTo: string[]
}

export class CreateTransferBadRequestDto extends BaseBadRequestDto<CreateTransferBadRequestErrors> {
  public errors!: CreateTransferBadRequestErrors
}
