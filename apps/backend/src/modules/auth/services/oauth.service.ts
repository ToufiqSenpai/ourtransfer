import { AuthProvider } from "@ourtransfer/common";
import { Cache } from "../../../infrastructure/cache/cache.interface";
import { OAuthAction } from "../enums/oauth-action.enum";
import { BadRequestException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { CommonResponseDto } from "@ourtransfer/dto";
import { randomBytes, createHash } from 'crypto';
import { UserService } from "../../user/services/user.service";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { Readable } from "stream";

export abstract class OAuthService {
  public constructor(
    protected readonly cache: Cache,
    protected readonly userService: UserService,
    protected readonly http: HttpService
  ) {}

  protected abstract get provider(): AuthProvider

  protected abstract get supportsPKCE(): boolean

  protected abstract buildAuthUrl(state: string, codeChallenge?: string): string

  protected abstract getUserProfile(accessToken: string, codeVerifier?: string): Promise<UserProfile>

  public async getAuthUrl(action: OAuthAction): Promise<string> {
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
      action,
      ...(codeVerifier && { codeVerifier })
    };

    await this.setSession(state, session);

    // Build provider-specific auth URL
    return this.buildAuthUrl(state, codeChallenge);
  }

  public async verify(state: string, code: string): Promise<void> {
    const session = await this.getSession(state)

    if (!session) {
      throw new BadRequestException(plainToInstance(CommonResponseDto, {
        message: "Invalid OAuth session state.",
      }))
    }

    try {
      const userProfile = await this.getUserProfile(code)

      if (session.action === OAuthAction.SIGN_UP) {
        const user = await this.userService.createUser(userProfile.name, userProfile.email)
        const userAvatar$ = this.http.get<Readable>(userProfile.avatarUrl, {
          responseType: 'stream'
        })
        const userAvatar = await firstValueFrom(userAvatar$)
          .then(response => response.data)
        await this.userService.putUserAvatar(user.id, userAvatar)
      }
    } catch (error) {

    }
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
  provider: AuthProvider
  action: OAuthAction
  codeVerifier?: string
}
