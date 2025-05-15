import { Controller, Body, Put, Get, Patch, Delete } from '@nestjs/common'
import {
  ApiBadRequestResponse,
  ApiConsumes,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger'
import { CommonResponseDto } from '../../../../common/dtos/common-response.dto'
import { UserDto } from '../../application/dtos/user.dto'
import { UpdateUserDto } from '../../application/dtos/update-user.dto'
import { UpdateUserBadRequestDto } from '../../application/dtos/update-user-bad-request.dto'

@Controller({ path: 'users', version: '1' })
export class UserController {
  public constructor() {}

  @Get('/me')
  @ApiOperation({
    summary: 'Get current user',
    description: 'Retrieves the details of the currently authenticated user.',
  })
  @ApiOkResponse({ type: UserDto, description: 'Details of the current user.' })
  @ApiUnauthorizedResponse({ type: CommonResponseDto, description: 'Unauthorized access.' })
  public getMe() {
    return 'OK'
  }

  @Patch('/me')
  @ApiOperation({
    summary: 'Update current user',
    description: 'Updates the details of the currently authenticated user.',
  })
  @ApiOkResponse({ type: UserDto, description: 'User details successfully updated.' })
  @ApiBadRequestResponse({ type: UpdateUserBadRequestDto, description: 'Invalid input data.' })
  @ApiUnauthorizedResponse({ type: CommonResponseDto, description: 'Unauthorized access.' })
  public updateMe(@Body() dto: UpdateUserDto) {}

  @Delete('/me')
  @ApiOperation({ summary: 'Delete current user', description: 'Deletes the currently authenticated user.' })
  @ApiNoContentResponse({ description: 'User successfully deleted.' })
  @ApiUnauthorizedResponse({ type: CommonResponseDto, description: 'Unauthorized access.' })
  public deleteMe() {}

  @Put('/me/avatar')
  @ApiOperation({
    summary: 'Update user avatar',
    description: 'Updates the avatar of the currently authenticated user. Max image size is 10MB.',
  })
  @ApiConsumes('image/*')
  @ApiOkResponse({ type: CommonResponseDto, description: 'Avatar successfully updated.' })
  @ApiPayloadTooLargeResponse({
    type: CommonResponseDto,
    description: 'Uploaded image exceeds the maximum allowed size.',
  })
  public updateAvatar() {}

  @Get('/me/avatar')
  @ApiOperation({
    summary: 'Get user avatar',
    description: 'Retrieves the avatar of the currently authenticated user.',
  })
  @ApiOkResponse({
    content: { 'image/*': { schema: { type: 'string', format: 'binary' } } },
    description: 'User avatar retrieved successfully.',
  })
  public getAvatar() {}
}
