import { Command } from '@nestjs/cqrs'
import { CreatePasswordAuthDto } from '../dtos/create-password-auth.dto'

export class CreatePasswordAuthCommand extends Command<void> {
  public constructor(public readonly dto: CreatePasswordAuthDto) {
    super()
  }
}
