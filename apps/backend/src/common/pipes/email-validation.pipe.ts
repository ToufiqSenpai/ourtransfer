import { BadRequestException, PipeTransform } from "@nestjs/common";
import { z } from 'zod'

export class EmailValidationPipe implements PipeTransform<string, string> {
  public transform(value: string): string {
    const emailSchema = z.string({ required_error: "Email is required", invalid_type_error: "Email must be a string" }).email("Invalid email format");
    const result = emailSchema.safeParse(value);

    if (!result.success) {
      throw new BadRequestException({ errors: { email: result.error.errors.map(err => err.message) } });
    }

    return value;
  }
}
