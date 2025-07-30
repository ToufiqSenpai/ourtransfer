import { Injectable, PipeTransform, UnauthorizedException } from '@nestjs/common'
import { LoginDto } from '@ourtransfer/dto'
import { z } from 'zod'
import { plainToInstance } from 'class-transformer'

@Injectable()
export class LoginValidationPipe implements PipeTransform<object, LoginDto> {
  public transform(value: object): LoginDto {
    const schema = z.object({
      email: z.string().min(1).max(100).email(),
      password: z
        .string()
        .min(6)
        .max(100)
        .refine(val => val.trim() !== ''),
    })
    const parsedSchema = schema.safeParse(value)

    if (!parsedSchema.success) {
      throw new UnauthorizedException({
        message: 'Email or password is incorrect.',
      })
    }

    return plainToInstance(LoginDto, parsedSchema.data)
  }
}
