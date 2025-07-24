import { Controller, Body, Query, Get, Put, Patch, Delete, ParseBoolPipe } from "@nestjs/common"
import { UserDto, CommonResponseDto, UpdateUserBadRequestDto, UpdateUserDto } from "@ourtransfer/dto"
import {
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiNoContentResponse,
  ApiPayloadTooLargeResponse,
  ApiQuery,
} from "@nestjs/swagger"

@Controller({ path: "/users", version: "1" })
export class UserController {
  @Get("/me")
  @ApiOperation({
    summary: "Get current user",
    description: "Retrieves the details of the currently authenticated user.",
  })
  @ApiOkResponse({ type: UserDto, description: "Details of the current user." })
  @ApiUnauthorizedResponse({ type: CommonResponseDto, description: "Unauthorized access." })
  public async getMe(): Promise<UserDto> {
    return new UserDto()
  }

  @Patch("/me")
  @ApiOperation({
    summary: "Update current user",
    description: "Updates the details of the currently authenticated user.",
  })
  @ApiOkResponse({ type: UserDto, description: "User details successfully updated." })
  @ApiBadRequestResponse({ type: UpdateUserBadRequestDto, description: "Invalid input data." })
  @ApiUnauthorizedResponse({ type: CommonResponseDto, description: "Unauthorized access." })
  public async updateMe(@Body() dto: UpdateUserDto): Promise<UserDto> {
    return new UserDto()
  }

  @Delete("/me")
  @ApiOperation({ summary: "Delete current user", description: "Deletes the currently authenticated user." })
  @ApiQuery({ name: "confirm", type: Boolean, required: true, description: "Confirmation flag to delete the user." })
  @ApiNoContentResponse({ description: "User successfully deleted." })
  @ApiUnauthorizedResponse({ type: CommonResponseDto, description: "Unauthorized access." })
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public async deleteMe(@Query("confirm", ParseBoolPipe) confirm: boolean): Promise<void> {

  }

  @Put("/me/avatar")
  @ApiOperation({
    summary: "Update user avatar",
    description: "Updates the avatar of the currently authenticated user. Max image size is 5MB.",
  })
  @ApiConsumes("image/jpeg", "image/png")
  @ApiOkResponse({ type: CommonResponseDto, description: "Avatar successfully updated." })
  @ApiPayloadTooLargeResponse({
    type: CommonResponseDto,
    description: "Uploaded image exceeds the maximum allowed size.",
  })
  public async updateAvatar(): Promise<CommonResponseDto> {
    return new CommonResponseDto()
  }
}
