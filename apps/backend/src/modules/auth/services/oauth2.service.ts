import { Cache } from "../../../infrastructure/cache/cache.interface";
import { BadRequestException, NotImplementedException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { CommonResponseDto, CreateUserDto } from "@ourtransfer/dto";
import { randomBytes, createHash } from 'crypto';
import { UserService } from "../../user/services/user.service";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { Readable } from "stream";
import { UserRepository } from "../../user/repositories/user.repository";
import { User } from "../../user/entities/user.entity";
import { OAuth2Provider } from "../enums/oauth2-provider.enum";
import { OAuth2Platform } from "../enums/oauth2-platform.enum";

export abstract class OAuth2Service {
  public constructor(
    protected readonly cache: Cache,
    protected readonly userService: UserService,
    protected readonly userRepository: UserRepository,
    protected readonly http: HttpService
  ) {}

  protected abstract get provider(): OAuth2Provider

  protected abstract get supportsPKCE(): boolean

  protected abstract buildAuthUrl(state: string, codeChallenge?: string): Promise<string> | string

  protected abstract getUserProfile(code: string, codeVerifier?: string): Promise<UserProfile>

  public async getAuthUrl(platform: OAuth2Platform): Promise<string> {
    if (![OAuth2Platform.WEB].includes(platform)) {
      throw new NotImplementedException(plainToInstance(CommonResponseDto, {
        message: `${platform} OAuth2 platform currently not supported.`
      }))
    }

    // Generate secure state parameter
    const state = this.generateSecureState();

    // Generate PKCE parameters only if provider supports it
    let codeVerifier: string | undefined;
    let codeChallenge: string | undefined;

    if (this.supportsPKCE) {
      codeVerifier = this.generateCodeVerifier();
      codeChallenge = this.generateCodeChallenge(codeVerifier);
    }

    // Create and store session
    const session: OAuthSession = {
      state,
      provider: this.provider,
      platform,
      ...(codeVerifier && { codeVerifier })
    };

    await this.setSession(state, session);

    // Build provider-specific auth URL
    return this.buildAuthUrl(state, codeChallenge);
  }

  public async verify(state: string, code: string): Promise<[User, OAuth2Platform]> {
    const session = await this.getSession(state)

    if (!session) {
      throw new BadRequestException(plainToInstance(CommonResponseDto, {
        message: "Invalid OAuth session state.",
      }))
    }

    const userProfile = await this.getUserProfile(code, session.codeVerifier)
    let user = await this.userRepository.findByEmail(userProfile.email)

    if (!user) {
      const userAvatar$ = this.http.get<Readable>(userProfile.avatarUrl, {
        responseType: 'stream'
      })
      const userAvatar = await firstValueFrom(userAvatar$)
        .then(response => response.data)

      const newUser = new CreateUserDto()
      newUser.name = userProfile.name
      newUser.email = userProfile.email

      user = await this.userService.createUser(newUser)
      await this.userService.putUserAvatar(user.id, userAvatar)
    }

    this.cache.delete(state)

    return [user, session.platform]
  }

  private generateSecureState(): string {
    return randomBytes(32).toString('hex');
  }

  private generateCodeVerifier(): string {
    return randomBytes(32).toString('base64url');
  }

  private generateCodeChallenge(verifier: string): string {
    const hash = createHash('sha256').update(verifier).digest();
    return hash.toString('base64url');
  }

  private getSessionKey(state: string): string {
    return `oauth:${this.provider.toLowerCase()}:${state}`
  }

  private async getSession(state: string): Promise<OAuthSession | null> {
    const sessionKey = this.getSessionKey(state);
    const session = await this.cache.get<OAuthSession>(sessionKey);
    return session || null;
  }

  private async setSession(state: string, session: OAuthSession): Promise<void> {
    const sessionKey = this.getSessionKey(state);
    await this.cache.set(sessionKey, session);
  }
}

export interface UserProfile {
  name: string
  email: string
  avatarUrl: string
}

export interface OAuthSession {
  state: string
  provider: OAuth2Provider
  platform: OAuth2Platform
  codeVerifier?: string
}
