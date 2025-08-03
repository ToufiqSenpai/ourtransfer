import { AuthenticationErrorCode } from "../enums/authentication-error-code.enum";

export class AuthenticationException extends Error {
  private readonly errorCode: AuthenticationErrorCode

  public constructor(errorCode: AuthenticationErrorCode, message?: string) {
    super(message || `Authentication error: ${errorCode}`);
    this.errorCode = errorCode;
  }

  public getErrorCode(): AuthenticationErrorCode {
    return this.errorCode;
  }
}
