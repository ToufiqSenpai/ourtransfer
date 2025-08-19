import { Inject, Injectable } from "@nestjs/common";
import { OAuth2Service, UserProfile } from "./oauth2.service";
import { OAuth2Provider } from "../enums/oauth2-provider.enum";
import { CACHE, Cache } from "../../../infrastructure/cache/cache.interface";
import { UserService } from "../../user/services/user.service";
import { UserRepository } from "../../user/repositories/user.repository";
import { HttpService } from "@nestjs/axios";
import { Options } from "jwks-rsa";
import { SecretManager } from "../../../infrastructure/secret/secret-manager.abstract";
import { lastValueFrom } from "rxjs";

@Injectable()
export class MicrosoftOAuth2Service extends OAuth2Service {

  public constructor(
    @Inject(CACHE) cache: Cache,
    userService: UserService,
    userRepository: UserRepository,
    http: HttpService,
    private readonly secret: SecretManager
  ) {
    super(cache, userService, userRepository, http)
  }

  protected get provider(): OAuth2Provider {
    return OAuth2Provider.MICROSOFT
  }

  protected get supportsPKCE(): boolean {
    return true
  }

  protected get jwksOptions(): Options | null {
    return {
      jwksUri: `https://login.microsoftonline.com/common/discovery/v2.0/keys`,
      cache: true,
      cacheMaxAge: 600, // 10 minutes
    }
  }

  protected async buildAuthUrl(state: string, codeChallenge?: string): Promise<string> {
    const url = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize")
    url.searchParams.append("client_id", await this.secret.getOrThrow("MICROSOFT_CLIENT_ID"))
    url.searchParams.append("redirect_uri", await this.secret.getOrThrow("MICROSOFT_REDIRECT_URI"))
    url.searchParams.append("response_type", "code")
    url.searchParams.append("scope", "openid email profile")
    url.searchParams.append("response_mode", "query")
    url.searchParams.append("state", state)
    url.searchParams.append("prompt", "select_account")

    if (codeChallenge) {
      url.searchParams.append("code_challenge", codeChallenge)
      url.searchParams.append("code_challenge_method", "S256")
    }

    return url.toString()
  }

  protected async getUserProfile(code: string, codeVerifier?: string): Promise<UserProfile> {
    const tokenUrl = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/token")
    tokenUrl.searchParams.append("client_id", await this.secret.getOrThrow("MICROSOFT_CLIENT_ID"))
    tokenUrl.searchParams.append("client_secret", await this.secret.getOrThrow("MICROSOFT_CLIENT_SECRET"))
    tokenUrl.searchParams.append("grant_type", "authorization_code")
    tokenUrl.searchParams.append("code", code)
    tokenUrl.searchParams.append("redirect_uri", await this.secret.getOrThrow("MICROSOFT_REDIRECT_URI"))

    if (codeVerifier) {
      tokenUrl.searchParams.append("code_verifier", codeVerifier)
    }

    const tokenResponse = await lastValueFrom(
      this.http.post<MicrosoftTokenResponse>(tokenUrl.toString(), null, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      })
    )
    const userInfo = await this.verifyAndDecodeIdToken<MicrosoftJwtPayload>(tokenResponse.data.id_token, {
      audience: await this.secret.getOrThrow("MICROSOFT_CLIENT_ID"),
      issuer: "https://login.microsoftonline.com/common/v2.0"
    })

    return {
      email: userInfo.email!,
      name: userInfo.name!,
      avatarUrl: userInfo.picture!
    }
  }
}

export interface MicrosoftTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  refresh_token?: string;
  id_token: string;
}

export interface MicrosoftJwtPayload {
  iss: string;           // Issuer
  sub: string;           // Subject (user ID)
  aud: string;           // Audience (client ID)
  exp: number;           // Expiration time
  iat: number;           // Issued at
  nbf: number;           // Not before
  name?: string;         // Full name
  preferred_username?: string; // Usually email
  email?: string;        // Email address
  family_name?: string;  // Last name
  given_name?: string;   // First name
  picture?: string;      // Profile picture URL
  tid: string;          // Tenant ID
  oid: string;          // Object ID (unique user identifier in tenant)
  upn?: string;         // User Principal Name
  unique_name?: string; // Unique name
  ver: string;          // Token version
}
