import { Body, Controller, Get, Post, HttpCode, HttpStatus } from "@nestjs/common"
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
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
  VerifyPasswordResetBadRequestDto,
} from "@ourtransfer/dto"

@Controller({ version: "1", path: "/auth" })
export class AuthController {
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
  public getLoginProvider(@Body() dto: GetLoginProviderDto): Promise<GetLoginProviderResponseDto> {}

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
  public requestVerificationFromEmail(@Body() dto: RequestVerificationFromEmailDto): Promise<CommonResponseDto> {}

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
  public verifyUserFromEmail(@Body() dto: VerifyUserFromEmailDto): Promise<CommonResponseDto> {}

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
  public async signup(@Body() dto: SignupDto): Promise<CommonResponseDto> {}

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
  @HttpCode(HttpStatus.OK)
  public async login(): Promise<TokensDto> {}

  @Get("/google")
  @ApiOperation({
    summary: "Redirect to Google for authentication",
    description: "This endpoint redirects the user to Google for authentication.",
  })
  @ApiOkResponse({
    type: GoogleAuthResponseDto,
    description: "The user has been redirected to Google for authentication.",
  })
  public async googleAuth(): Promise<GoogleAuthResponseDto> {}

  @Get("/google/redirect")
  @ApiOperation({
    summary: "Handle Google authentication redirect",
    description: "This endpoint handles the redirect from Google after the user has authenticated.",
  })
  public async googleAuthRedirect(): Promise<void> {}

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
  public async refreshToken(): Promise<TokensDto> {}

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
  public async passwordReset(): Promise<CommonResponseDto> {}

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
  public async changePassword(): Promise<CommonResponseDto> {}
}
