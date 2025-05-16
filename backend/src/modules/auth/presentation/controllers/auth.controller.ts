import { Body, Controller, Get, Post, Query, UsePipes } from '@nestjs/common'
import { GetLoginProviderDto } from '../../application/dtos/get-login-provider.dto'
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger'
import { GetLoginProviderResponseDto } from '../../application/dtos/get-login-provider-response.dto'
import { RequestVerificationFromEmailDto } from '../../application/dtos/request-verification-from-email.dto'
import { VerifyUserFromEmailDto } from '../../application/dtos/verify-user-from-email.dto'
import { CommonResponseDto } from '../../../../common/dtos/common-response.dto'
import { GetLoginProviderBadRequestDto } from '../../application/dtos/get-login-provider-bad-request.dto'
import { RequestVerificationBadRequestDto } from '../../application/dtos/request-verification-bad-request.dto'
import { VerifyUserFromEmailBadRequestDto } from '../../application/dtos/verify-user-from-email-bad-request.dto'
import { SignupDto } from '../../application/dtos/signup.dto'
import { SignupBadRequestDto } from '../../application/dtos/signup-bad-request.dto'
import { LoginDto } from '../../application/dtos/login.dto'
import { LoginResponseDto } from '../../application/dtos/login-response.dto'
import { PasswordResetBadRequestDto } from '../../application/dtos/password-reset-bad-request.dto'
import { PasswordResetDto } from '../../application/dtos/password-reset.dto'
import { VerifyPasswordResetDto } from '../../application/dtos/verify-password-reset.dto'
import { GoogleAuthResponseDto } from '../../application/dtos/google-auth-response.dto'
import { SignupValidationPipe } from '../pipes/signup-validation.pipe'
import { CommandBus } from '@nestjs/cqrs'
import { SignupCommand } from '../../application/commands/signup.command'

@ApiTags('Authentication')
@Controller('/auth')
export class AuthController {
  public constructor(private readonly commandBus: CommandBus) {}

  @Post('/login-provider')
  @ApiOperation({ summary: 'Get login provider details' })
  @ApiOkResponse({ type: GetLoginProviderResponseDto })
  @ApiBadRequestResponse({ type: GetLoginProviderBadRequestDto })
  @ApiNotFoundResponse({ type: CommonResponseDto })
  public getLoginProvider(@Body() dto: GetLoginProviderDto) {}

  @Post('/email/request')
  @ApiOperation({ summary: 'Request email verification' })
  @ApiOkResponse({ type: CommonResponseDto })
  @ApiBadRequestResponse({ type: RequestVerificationBadRequestDto })
  @ApiNotFoundResponse({ type: CommonResponseDto })
  public requestVerificationFromEmail(@Body() dto: RequestVerificationFromEmailDto) {}

  @Post('/email/verify')
  @ApiOperation({ summary: 'Verify user from email' })
  @ApiOkResponse({ type: CommonResponseDto })
  @ApiBadRequestResponse({ type: VerifyUserFromEmailBadRequestDto })
  public verifyUserFromEmail(@Body() dto: VerifyUserFromEmailDto) {}

  @Post('/signup')
  @ApiOperation({ summary: 'Sign up a new user' })
  @ApiCreatedResponse({ type: CommonResponseDto })
  @ApiBadRequestResponse({ type: SignupBadRequestDto })
  @UsePipes(SignupValidationPipe)
  public signup(@Body() dto: SignupDto): Promise<CommonResponseDto> {
    return this.commandBus.execute<SignupCommand, CommonResponseDto>(new SignupCommand(dto))
  }

  @Post('/login')
  @ApiOperation({ summary: 'Log in a user' })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiUnauthorizedResponse({ type: CommonResponseDto })
  public login(@Body() dto: LoginDto) {}

  @Get('/google')
  @ApiOperation({ summary: 'Authenticate with Google' })
  @ApiOkResponse({ type: GoogleAuthResponseDto })
  public googleAuth() {}

  @Get('/google/redirect')
  @ApiOperation({ summary: 'Handle Google authentication redirect' })
  public googleAuthRedirect(@Query('code') code: string) {}

  @Post('/password-reset')
  @ApiOperation({ summary: 'Request password reset' })
  @ApiOkResponse({ type: CommonResponseDto })
  @ApiBadRequestResponse({ type: PasswordResetBadRequestDto })
  public resetPassword(@Body() dto: PasswordResetDto) {}

  @Post('/password-reset/verify')
  @ApiOperation({ summary: 'Verify and change password' })
  @ApiOkResponse({ type: CommonResponseDto })
  public changePassword(@Body() dto: VerifyPasswordResetDto) {}
}
