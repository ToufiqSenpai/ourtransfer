import { PipeTransform } from "@nestjs/common";
import { SendLoginVerificationCodeDto } from "@ourtransfer/dto";
import { plainToInstance } from "class-transformer";
import z from "zod";

export class SendLoginVerificationCodePipe implements PipeTransform<object, SendLoginVerificationCodeDto> {
  public transform(value: object): SendLoginVerificationCodeDto {
    const schema = z.object({
      email: z
        .string({ required_error: "Email is required.", invalid_type_error: "Email must be a string." })
        .min(1, "Min email length is 1.")
        .max(100, "Max email length is 100.")
        .email("Email is not valid.")
    })

    return plainToInstance(SendLoginVerificationCodeDto, schema.parse(value))
  }
}
