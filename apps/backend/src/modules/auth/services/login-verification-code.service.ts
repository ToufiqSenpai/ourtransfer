import { Inject } from "@nestjs/common";
import { EmailService } from "../../../infrastructure/email/email.service";
import { TEXT_HASHER, TextHasher } from "../../../infrastructure/security/hash/text-hasher.interface";
import { User } from "../../user/entities/user.entity";
import { LoginVerificationCode } from "../entities/login-verification-code.entity";
import { ConfigService } from "@nestjs/config";
import { LoginVerificationCodeRepository } from "../repositories/login-verification-code.repository";
import { randomInt } from "crypto";

/**
 * Service for handling login verification codes for user authentication.
 *
 * Responsibilities:
 * - Generate and send verification codes to users via email
 * - Verify submitted codes and revoke them after use
 */
export class LoginVerificationCodeService {
  /**
   * Constructs the VerificationCodeService.
   * @param textHasher Service for hashing text values
   * @param loginVerificationCodeRepository Repository for verification code entities
   * @param emailService Service for sending emails
   * @param config Config service for application settings
   */
  public constructor(
    @Inject(TEXT_HASHER) private readonly textHasher: TextHasher,
    private readonly loginVerificationCodeRepository: LoginVerificationCodeRepository,
    private readonly emailService: EmailService,
    private readonly config: ConfigService
  ) {}

  /**
   * Generates a verification code, saves it to the repository, and sends it to the user via email.
   * @param user The user to send the verification code to
   * @returns Promise that resolves when the code is sent
   */
  public async sendVerificationCode(user: User): Promise<void> {
    const code = randomInt(100000, 999999);
    const verificationCode = new LoginVerificationCode();
    verificationCode.code = await this.textHasher.hash(code.toString());
    verificationCode.user = user;
    verificationCode.expiresAt = new Date(Date.now() + this.config.getOrThrow<number>('auth.loginVerificationCode.expiresIn') * 1000);

    await this.loginVerificationCodeRepository.save(verificationCode);

    await this.emailService.sendEmail(user.email, 'Your Verification Code', {
      name: 'login-verification-code',
      payload: { code: code.toString() },
    });
  }

  /**
   * Verifies a submitted code for a user. Revokes the code if valid and not expired.
   * @param user The user submitting the code
   * @param code The code to verify
   * @returns Promise resolving to true if the code is valid, false otherwise
   */
  public async verifyCode(user: User, code: string): Promise<boolean> {
    // Hash the submitted code to compare with stored hashed codes
    const hashedCode = await this.textHasher.hash(code);

    // Find the specific verification code by the hashed code and user
    const verificationCodes = await this.loginVerificationCodeRepository.findByUserId(user.id);

    for (const verificationCode of verificationCodes) {
      if (
        verificationCode.code === hashedCode &&
        verificationCode.expiresAt > new Date() &&  // not expired
        !verificationCode.revoked                   // not revoked
      ) {
        verificationCode.revoke()

        await this.loginVerificationCodeRepository.update(verificationCode.id, verificationCode);

        return true;
      }
    }

    return false;
  }
}
