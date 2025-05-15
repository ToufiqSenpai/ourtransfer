import { Injectable, PipeTransform } from '@nestjs/common'
import { SignupDto } from '../../application/dtos/signup.dto'
import { z } from 'zod'
import { QueryBus } from '@nestjs/cqrs'
import { IsUserEmailUniqueQuery } from '../../../user/application/queries/is-user-email-unique.query'
import { plainToInstance } from 'class-transformer'

@Injectable()
export class SignupValidationPipe implements PipeTransform<object, Promise<SignupDto>> {
  public constructor(private readonly queryBus: QueryBus) {}

  public async transform(value: object): Promise<SignupDto> {
    const schema = z.object({
      name: z
        .string({ required_error: 'Name is required.', invalid_type_error: 'Name must be string.' })
        .min(1, { message: 'Name is required.' })
        .max(100, { message: 'Name must be less than 100 characters.' }),
      email: z
        .string({ required_error: 'Email is required.', invalid_type_error: 'Email must be string.' })
        .min(1, { message: 'Email is required.' })
        .max(100, { message: 'Email must be less than 100 characters.' })
        .email({ message: 'Email must be a valid email address.' })
        .refine(async email => await this.queryBus.execute(new IsUserEmailUniqueQuery(email)), {
          message: 'Email already exists.',
        }),
      password: z
        .string({ required_error: 'Password is required.', invalid_type_error: 'Password must be string.' })
        .min(6, { message: 'Password must be at least 6 characters long.' })
        .max(100, { message: 'Password must be less than 100 characters.' }),
    })
    const parsedValue = await schema.parseAsync(value)

    return plainToInstance(SignupDto, parsedValue) as SignupDto
  }
}
