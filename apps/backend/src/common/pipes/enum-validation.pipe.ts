import { ArgumentMetadata, PipeTransform } from "@nestjs/common";
import { z, EnumLike } from "zod";

export class EnumValidationPipe<T extends EnumLike> implements PipeTransform<any, T[keyof T]> {
  public constructor(private readonly enumType: T, private readonly required: boolean = false) {}

  public transform(value: any, metadata: ArgumentMetadata): T[keyof T] {
    const key = metadata.data || "value";
    let enumSchema: z.ZodOptional<any> | z.ZodNativeEnum<any> = z.nativeEnum(this.enumType)

    if (!this.required) {
      enumSchema = enumSchema.optional()
    }
    const schema = z.object({
      [key]: enumSchema,
    })

    schema.parse({ [key]: value })

    return value as T[keyof T]
  }
}
