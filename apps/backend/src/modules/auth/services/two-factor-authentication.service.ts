import { ConfigService } from "@nestjs/config";
import { User } from "../../user/entities/user.entity";
import { authenticator, totp } from 'otplib'
import { Injectable } from "@nestjs/common";

export interface GeneratedSecret {
  secret: string
  otpauthUrl: string
}

@Injectable()
export class TwoFactorAuthenticationService {
  private readonly APP_NAME: string

  public constructor(
    private readonly config: ConfigService
  ) {
    this.APP_NAME = config.getOrThrow<string>('app.name')
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
