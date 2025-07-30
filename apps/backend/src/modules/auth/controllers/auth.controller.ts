import { Body, Controller, Get, Post, HttpCode, HttpStatus, Headers, Res } from "@nestjs/common"
import { CommandBus } from '@nestjs/cqrs';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse, ApiForbiddenResponse,
} from "@nestjs/swagger"
import {
  GetLoginProviderResponseDto,
  GetLoginProviderBadRequestDto,
  CommonResponseDto,
  GetLoginProviderDto,
  RequestVerificationFromEmailDto,
  RequestVerificationFromEmailBadRequestDto,
  VerifyUserFromEmailDto,
  VerifyUserFromEmailBadRequestDto,
  SignupBadRequestDto,
  SignupDto,
  GoogleAuthResponseDto,
  TokensDto,
  PasswordResetBadRequestDto,
  VerifyPasswordResetBadRequestDto, LoginDto,
} from "@ourtransfer/dto"
import { SignupValidationPipe } from '../pipes/signup-validation.pipe';
import { SignupCommand } from '../commands/signup.command';
import { LoginCommand } from "../commands/login.command"
import { IpAddress } from "../../../common/decorators/parameter/ip-address.decorator"
import { Response, CookieOptions } from "express"
import { REFRESH_TOKEN_COOKIE_NAME } from "../../../infrastructure/constants/cookie-name.constant"
import { NodeEnv } from "@ourtransfer/common"
import { ConfigService } from "@nestjs/config"
import { LoginValidationPipe } from '../pipes/login-validation.pipe';

@Controller({ version: "1", path: "/auth" })
export class AuthController {
  public constructor(private readonly commandBus: CommandBus, private readonly config: ConfigService) {}

  @Post("/login-provider")
  @ApiOperation({
    summary: "Get login provider by email",
    description:
      "This endpoint returns the login provider for a given email address. This is useful for determining whether a user should log in with a password or a social provider.",
  })
  @ApiOkResponse({
    type: GetLoginProviderResponseDto,
    description: "The login provider for the given email address.",
  })
  @ApiBadRequestResponse({
    type: GetLoginProviderBadRequestDto,
    description: "The request body is invalid.",
  })
  @ApiNotFoundResponse({
    type: CommonResponseDto,
    description: "The user with the given email address was not found.",
  })
  public async getLoginProvider(@Body() dto: GetLoginProviderDto): Promise<GetLoginProviderResponseDto> {
    return new GetLoginProviderResponseDto()
  }

  @Post("/email/request")
  @ApiOperation({
    summary: "Request email verification",
    description:
      "This endpoint sends a verification email to the user with a code that can be used to verify their email address.",
  })
  @ApiOkResponse({
    type: CommonResponseDto,
    description: "The verification email has been sent successfully.",
  })
  @ApiBadRequestResponse({
    type: RequestVerificationFromEmailBadRequestDto,
    description: "The request body is invalid.",
  })
  @ApiNotFoundResponse({
    type: CommonResponseDto,
    description: "The user with the given email address was not found.",
  })
  public async requestVerificationFromEmail(@Body() dto: RequestVerificationFromEmailDto): Promise<CommonResponseDto> {
    return new CommonResponseDto()
  }

  @Post("/email/verify")
  @ApiOperation({
    summary: "Verify email address",
    description: "This endpoint verifies the user's email address with the code sent to them.",
  })
  @ApiOkResponse({
    type: CommonResponseDto,
    description: "The email address has been verified successfully.",
  })
  @ApiBadRequestResponse({
    type: VerifyUserFromEmailBadRequestDto,
    description: "The request body is invalid or the verification code is incorrect.",
  })
  public async verifyUserFromEmail(@Body() dto: VerifyUserFromEmailDto): Promise<CommonResponseDto> {
    return new CommonResponseDto()
  }

  @Post("/signup")
  @ApiOperation({
    summary: "Sign up a new user",
    description: "This endpoint creates a new user with the provided details.",
  })
  @ApiCreatedResponse({
    type: CommonResponseDto,
    description: "The user has been created successfully.",
  })
  @ApiBadRequestResponse({
    type: SignupBadRequestDto,
    description: "The request body is invalid or a user with the given email address already exists.",
  })
  public async signup(@Body(SignupValidationPipe) dto: SignupDto): Promise<CommonResponseDto> {
    return this.commandBus.execute(new SignupCommand(dto))
  }

  @Post("/login")
  @ApiOperation({
    summary: "Login a user",
    description: "This endpoint logs in a user with their email and password and returns a new set of tokens.",
  })
  @ApiOkResponse({
    type: TokensDto,
    description: "The user has been logged in successfully.",
  })
  @ApiUnauthorizedResponse({
    type: CommonResponseDto,
    description: "The user is not authorized to perform this action.",
  })
  @ApiForbiddenResponse({
    type: CommonResponseDto,
    description: "The user is not allowed to log in with the provided credentials.",
  })
  @HttpCode(HttpStatus.OK)
  public async login(
    @Body(LoginValidationPipe) dto: LoginDto,
    @Headers('User-Agent') userAgent: string,
    @IpAddress() ipAddress: string,
    @Res() res: Response
  ): Promise<void> {
    const tokens = await this.commandBus.execute(new LoginCommand(dto, userAgent, ipAddress))

    res.cookie(REFRESH_TOKEN_COOKIE_NAME, tokens.refreshToken, this.getSetCookieOptions())

    res.status(HttpStatus.OK).json(tokens)
  }

  @Get("/google")
  @ApiOperation({
    summary: "Redirect to Google for authentication",
    description: "This endpoint redirects the user to Google for authentication.",
  })
  @ApiOkResponse({
    type: GoogleAuthResponseDto,
    description: "The user has been redirected to Google for authentication.",
  })
  public async googleAuth(): Promise<GoogleAuthResponseDto> {
    return new GoogleAuthResponseDto()
  }

  @Get("/google/redirect")
  @ApiOperation({
    summary: "Handle Google authentication redirect",
    description: "This endpoint handles the redirect from Google after the user has authenticated.",
  })
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public async googleAuthRedirect(): Promise<void> {

  }

  @Post("/refresh")
  @ApiOperation({
    summary: "Refresh access token",
    description: "This endpoint refreshes the access token using the refresh token.",
  })
  @ApiOkResponse({
    type: TokensDto,
    description: "The access token has been refreshed successfully.",
  })
  @ApiUnauthorizedResponse({
    type: CommonResponseDto,
    description: "The user is not authorized to perform this action.",
  })
  @HttpCode(HttpStatus.OK)
  public async refreshToken(): Promise<TokensDto> {
    return new TokensDto()
  }

  @Post("/password-reset")
  @ApiOperation({
    summary: "Request password reset",
    description: "This endpoint sends a password reset email to the user.",
  })
  @ApiOkResponse({
    type: CommonResponseDto,
    description: "The password reset email has been sent successfully.",
  })
  @ApiBadRequestResponse({
    type: PasswordResetBadRequestDto,
    description: "The request body is invalid.",
  })
  public async passwordReset(): Promise<CommonResponseDto> {
    return new CommonResponseDto()
  }

  @Post("/password-reset/verify")
  @ApiOperation({
    summary: "Verify password reset",
    description: "This endpoint verifies the password reset token and allows the user to change their password.",
  })
  @ApiOkResponse({
    type: CommonResponseDto,
    description: "The password has been changed successfully.",
  })
  @ApiBadRequestResponse({
    type: VerifyPasswordResetBadRequestDto,
    description: "The request body is invalid or the password reset token is incorrect.",
  })
  public async changePassword(): Promise<CommonResponseDto> {
    return new CommonResponseDto()
  }

  private getSetCookieOptions(): CookieOptions {
    return {
      domain: this.config.get('client.web.domain'),
      httpOnly: true,
      maxAge: this.config.get('auth.refreshToken.expiresIn'),
      sameSite: this.config.get('app.nodeEnv') === NodeEnv.PRODUCTION ? 'none' : 'strict',
      secure: this.config.get('app.nodeEnv') === NodeEnv.PRODUCTION,
    }
  }
}
