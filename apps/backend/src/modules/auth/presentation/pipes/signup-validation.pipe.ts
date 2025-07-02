import { Inject, Injectable, PipeTransform } from '@nestjs/common';
import { SignupDto } from '@ourtransfer/dto'
import { z } from 'zod'
import { plainToInstance } from 'class-transformer'
import { USER_REPOSITORY, UserRepository } from '../../../user/domain/repositories/user.repository';

@Injectable()
export class SignupValidationPipe implements PipeTransform<object, Promise<SignupDto>> {
  public constructor(@Inject(USER_REPOSITORY) private readonly userRepository: UserRepository) {}

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
        .refine(async email => !(await this.userRepository.isExistsByEmail(email)), {
          message: 'Email already in use.',
        }),
      password: z
        .string({ required_error: 'Password is required.', invalid_type_error: 'Password must be string.' })
        .min(6, { message: 'Password must be at least 6 characters long.' })
        .max(100, { message: 'Password must be less than 100 characters.' }),
    })
    const parsedValue = await schema.parseAsync(value)

    return plainToInstance(SignupDto, parsedValue)
  }
}
