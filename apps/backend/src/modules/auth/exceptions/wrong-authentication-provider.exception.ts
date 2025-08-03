import { AuthProvider } from '@ourtransfer/common';
import { AuthenticationErrorCode } from "../enums/authentication-error-code.enum";
import { AuthenticationException } from "./authentication.exception";

export class WrongAuthenticationProviderException extends AuthenticationException {
  public constructor(protected readonly wrongProvider: AuthProvider, protected readonly correctProvider: AuthProvider) {
    super(AuthenticationErrorCode.WRONG_AUTHENTICATION_PROVIDER, `Wrong authentication provider: ${wrongProvider}. Expected: ${correctProvider}.`);
    this.name = "WrongAuthenticationProviderException";
  }

  public getWrongProvider(): AuthProvider {
    return this.wrongProvider;
  }

  public getCorrectProvider(): AuthProvider {
    return this.correctProvider;
  }
}
