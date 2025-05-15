import { Command } from '@nestjs/cqrs'

export class CreatePasswordAuthCommand extends Command<void> {
  public constructor(
    public readonly email: string,
    public readonly password: string,
  ) {
    super()
  }
}
