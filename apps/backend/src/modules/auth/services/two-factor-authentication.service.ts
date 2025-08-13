import { ConfigService } from "@nestjs/config";
import { User } from "../../user/entities/user.entity";
import { TwoFactorAuthentication } from "../entities/two-factor-authentication.entity";
import { authenticator, totp } from 'otplib'

export interface GeneratedSecret {
  secret: string
  otpauthUrl: string
}

export class TwoFactorAuthenticationService {
  private readonly APP_NAME: string

  public constructor(
    private readonly config: ConfigService
  ) {
    this.APP_NAME = this.config.getOrThrow<string>('app.name')
  }

  public generateSecret(userEmail: string): GeneratedSecret {
    const secret = authenticator.generateSecret()
    const url = totp.keyuri(userEmail, this.APP_NAME, secret)

    return {
      secret,
      otpauthUrl: url
    }
  }

  public async createTwoFactorAuth(user: User): Promise<void> {

  }

  // Service methods for two-factor authentication
  public async verifyCode(userEmail: string, token: string): Promise<boolean> {
    // Implement verification logic
    return true;
  }
}
