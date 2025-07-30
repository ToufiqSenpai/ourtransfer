import { CommandHandler, ICommandHandler } from '@nestjs/cqrs'
import { ForbiddenException, Inject, UnauthorizedException } from "@nestjs/common"
import { LoginCommand } from '../login.command'
import { TokensDto, CommonResponseDto } from '@ourtransfer/dto'
import {
  PASSWORD_HASHER,
  PasswordHasher,
} from '../../../../infrastructure/security/hash/password-hasher.interface'
import { plainToInstance } from 'class-transformer'
import { ACCESS_TOKEN_JWT } from '../../../../infrastructure/security/jwt/access-token-jwt.interface'
import { Jwt } from '../../../../infrastructure/security/jwt/jwt.interface'
import { REFRESH_TOKEN_SERVICE, RefreshTokenService } from '../../services/refresh-token.service'
import { UserRepository } from "../../../user/repositories/user.repository"
import { AuthProvider } from "@ourtransfer/common"
import { PasswordIdentity } from "../../entities/password-identity.entity"
import { DataSource } from 'typeorm'
import { Logger, LOGGER } from "../../../../infrastructure/logger/logger.interface"
import { User } from "../../../user/entities/user.entity"

@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand> {
  public constructor(
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(ACCESS_TOKEN_JWT) private readonly accessToken: Jwt,
    @Inject(REFRESH_TOKEN_SERVICE) private readonly refreshTokenService: RefreshTokenService,
    @Inject(LOGGER) private readonly logger: Logger,
    private readonly userRepository: UserRepository,
    private readonly dataSource: DataSource,
  ) {}

  public async execute(command: LoginCommand): Promise<TokensDto> {
    // Get user with password identity
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.identities', 'identity')
      .where('user.email = :email', { email: command.dto.email })
      .andWhere('identity.authProvider = :authProvider', { authProvider: AuthProvider.EMAIL_PASSWORD })
      .getOne()

    if (!user) {
      throw new UnauthorizedException(plainToInstance(CommonResponseDto, {
        message: 'Email or password is incorrect.',
      }))
    }

    // Check for identities existence
    if (!user.identities || user.identities.length === 0) {
      throw new ForbiddenException(plainToInstance(CommonResponseDto, {
        message: "Unsupported authentication method. Please use a different login method."
      }))
    }

    // Find password identity safely
    const passwordIdentity = user.identities.find(identity => identity instanceof PasswordIdentity)
    if (!passwordIdentity || !(passwordIdentity instanceof PasswordIdentity)) {
      throw new UnauthorizedException(plainToInstance(CommonResponseDto, {
        message: 'Email or password is incorrect.',
      }))
    }

    // Ensure password hash exists
    if (!passwordIdentity.passwordHash || !passwordIdentity.passwordHash.trim()) {
      throw new UnauthorizedException(plainToInstance(CommonResponseDto, {
        message: 'Email or password is incorrect.',
      }))
    }

    // Verify password
    const isPasswordValid = await this.passwordHasher.compare(command.dto.password, passwordIdentity.passwordHash)
    if (!isPasswordValid) {
      throw new UnauthorizedException(plainToInstance(CommonResponseDto, {
        message: 'Email or password is incorrect.',
      }))
    }

    // Generate tokens
    const accessToken = await this.accessToken.sign(user.id)
    const refreshToken = await this.refreshTokenService.create(user, command.userAgent, command.ipAddress)

    // Update last sign in timestamps in transaction
    try {
      await this.dataSource.transaction(async manager => {
        // Update password identity
        passwordIdentity.updateLastSignInAt()
        await manager.update(PasswordIdentity, passwordIdentity.id, {
          lastSignInAt: passwordIdentity.lastSignInAt
        })

        // Update user
        user.updateLastSignInAt()
        await manager.update(User, user.id, {
          lastSignInAt: user.lastSignInAt
        })
      })
    } catch (updateError) {
      // Log the error but don't fail the login since tokens are already generated
      this.logger.error('Failed to update last sign in timestamps', updateError)
    }

    const tokens = new TokensDto()
    tokens.accessToken = accessToken
    tokens.refreshToken = refreshToken.token

    return tokens
  }
}
