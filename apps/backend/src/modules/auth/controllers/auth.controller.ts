import { Body, Controller, Get, Post, HttpCode, HttpStatus, Headers, Res, Query } from "@nestjs/common"
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiQuery,
} from "@nestjs/swagger"
import {
  RequestVerificationFromEmailBadRequestDto,
  RequestVerificationFromEmailDto,
  CommonResponseDto,
  VerifyUserFromEmailDto,
  VerifyUserFromEmailBadRequestDto,
  SignupBadRequestDto,
  SignupDto,
  GoogleAuthResponseDto,
  TokensDto,
  PasswordResetBadRequestDto,
  VerifyPasswordResetBadRequestDto,
  LoginDto,
  SendLoginVerificationCodeDto,
  LoginUnauthorizedDto,
  MicrosoftAuthResponseDto
} from "@ourtransfer/dto"
import { SignupValidationPipe } from '../pipes/signup-validation.pipe';
import { SignupCommand } from '../commands/signup.command';
import { LoginCommand } from "../commands/login.command"
import { IpAddress } from "../../../common/decorators/parameter/ip-address.decorator"
import { Response, CookieOptions } from "express"
import { REFRESH_TOKEN_COOKIE_NAME } from "../constants/cookie-name.constant"
import { NodeEnv } from "@ourtransfer/common"
import { ConfigService } from "@nestjs/config"
import { LoginValidationPipe } from '../pipes/login-validation.pipe';
import { SendLoginVerificationCodeCommand } from "../commands/send-login-verification-code.command";
import { SendLoginVerificationCodePipe } from "../pipes/send-login-verification-code.pipe";
import { GetGoogleAuthUrlQuery } from "../queries/get-google-auth-url.query";
import { OAuth2Platform } from "../enums/oauth2-platform.enum";
import { EnumValidationPipe } from "../../../common/pipes/enum-validation.pipe";
import { GoogleOAuth2CallbackCommand } from "../commands/google-oauth2-callback.command";
import { OAuth2Provider } from "../enums/oauth2-provider.enum";
import { GetMicrosoftAuthUrlQuery } from "../queries/get-microsoft-auth-url.query";
import { MicrosoftOAuth2CallbackCommand } from "../commands/microsoft-oauth2-callback.command";
import { OAuth2CallbackResult } from "../types/oauth2-callback-result.interface";

@Controller({ version: "1", path: "/auth" })
export class AuthController {
  public constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
    private readonly config: ConfigService
  ) {}

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
    type: LoginUnauthorizedDto,
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

  @Post('/login/send-verification-code')
  @ApiOperation({
    summary: "Send login verification code",
    description: "This endpoint sends a verification code to the user's email address for login purposes."
  })
  @ApiOkResponse({
    type: CommonResponseDto,
    description: "The verification code has been sent successfully."
  })
  @ApiNotFoundResponse({
    type: CommonResponseDto,
    description: "The user with the given email address was not found."
  })
  @HttpCode(HttpStatus.OK)
  public async sendVerificationCode(@Body(SendLoginVerificationCodePipe) dto: SendLoginVerificationCodeDto): Promise<CommonResponseDto> {
    return this.commandBus.execute(new SendLoginVerificationCodeCommand(dto))
  }

  @Get("/google")
  @ApiOperation({
    summary: "Get Google OAuth2 URL",
    description: "This endpoint returns the Google OAuth2 URL for authentication.",
  })
  @ApiQuery({
    name: 'platform',
    enum: OAuth2Platform,
    description: 'The platform for which to retrieve the Google OAuth2 URL.',
    required: true,
  })
  @ApiOkResponse({
    type: GoogleAuthResponseDto,
    description: "The Google OAuth2 URL has been retrieved successfully.",
  })
  public async googleAuth(@Query('platform', new EnumValidationPipe(OAuth2Platform, true)) platform: OAuth2Platform): Promise<GoogleAuthResponseDto> {
    return this.queryBus.execute(new GetGoogleAuthUrlQuery(platform))
  }

  @Get("/google/callback")
  @ApiOperation({
    summary: "Handle Google authentication redirect",
    description: "This endpoint handles the redirect from Google after the user has authenticated.",
  })
  public async googleAuthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Headers('User-Agent') userAgent: string,
    @IpAddress() ipAddress: string,
    @Res() res: Response
  ): Promise<void> {
    const result = await this.commandBus.execute(new GoogleOAuth2CallbackCommand(
      code,
      state,
      userAgent,
      ipAddress
    ))

    if (result.platform == OAuth2Platform.WEB) {
      const searchParams = new URLSearchParams({
        success: "true",
        provider: OAuth2Provider.GOOGLE
      })

      res.cookie(REFRESH_TOKEN_COOKIE_NAME, result.refreshToken, this.getSetCookieOptions())
      res.redirect(`${this.config.getOrThrow('client.web.oauth2Redirect')}?${searchParams.toString()}`)
    } else {
      res.status(500).send('Platform is not supported')
    }
  }

  @Get("/microsoft")
  @ApiOperation({
    summary: "Get Microsoft OAuth2 URL",
    description: "This endpoint returns the Microsoft OAuth2 URL for authentication.",
  })
  @ApiQuery({
    name: 'platform',
    enum: OAuth2Platform,
    description: 'The platform for which to retrieve the Microsoft OAuth2 URL.',
    required: true,
  })
  @ApiOkResponse({
    type: MicrosoftAuthResponseDto,
    description: "The Microsoft OAuth2 URL has been retrieved successfully.",
  })
  public async microsoftAuth(@Query('platform', new EnumValidationPipe(OAuth2Platform, true)) platform: OAuth2Platform): Promise<MicrosoftAuthResponseDto> {
    return this.queryBus.execute(new GetMicrosoftAuthUrlQuery(platform))
  }

  @Get("/microsoft/callback")
  @ApiOperation({
    summary: "Handle Microsoft authentication redirect",
    description: "This endpoint handles the redirect from Microsoft after the user has authenticated.",
  })
  public async microsoftAuthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Headers('User-Agent') userAgent: string,
    @IpAddress() ipAddress: string,
    @Res() res: Response
  ): Promise<void> {
    const result = await this.commandBus.execute(new MicrosoftOAuth2CallbackCommand(
      code,
      state,
      userAgent,
      ipAddress
    ))

    this.handleOAuth2CallbackResponse(OAuth2Provider.MICROSOFT, result, res)
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

  private handleOAuth2CallbackResponse(provider: OAuth2Provider, result: OAuth2CallbackResult, res: Response): void {
    if (result.platform === OAuth2Platform.WEB) {
      const searchParams = new URLSearchParams({
        success: "true",
        provider
      });

      res.cookie(REFRESH_TOKEN_COOKIE_NAME, result.refreshToken, this.getSetCookieOptions());
      res.redirect(`${this.config.getOrThrow('client.web.oauth2Redirect')}?${searchParams.toString()}`);
    } else {
      res.status(500).send('Platform is not supported');
    }
  }
}
