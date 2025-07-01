import { AutoMap } from "@automapper/classes"
import { ApiProperty } from "@nestjs/swagger"

export class UserDto {
  @ApiProperty({ description: "Unique identifier of the user.", example: "123e4567-e89b-12d3-a456-426614174000" })
  @AutoMap()
  public id!: string

  @ApiProperty({ description: "Email address of the user.", example: "user@example.com" })
  @AutoMap()
  public email!: string

  @ApiProperty({ description: "Name of the user.", example: "John Doe" })
  @AutoMap()
  public name!: string

  @ApiProperty({ description: "Avatar URL of the user.", example: "https://example.com/avatar.jpg", required: false })
  public avatarUrl?: string

  @ApiProperty({ description: "Timestamp when the user was created.", example: "2023-01-01T12:00:00Z" })
  @AutoMap()
  public createdAt!: Date

  @ApiProperty({ description: "Timestamp when the user was last updated.", example: "2023-01-02T15:30:00Z" })
  @AutoMap()
  public updatedAt!: Date
}
