import { OAuth2Service, UserProfile } from "./oauth2.service";
import { Inject, Injectable } from "@nestjs/common";
import { CACHE, Cache } from "../../../infrastructure/cache/cache.interface";
import { UserService } from "../../user/services/user.service";
import { UserRepository } from "../../user/repositories/user.repository";
import { HttpService } from "@nestjs/axios";
import { SecretManager } from "../../../infrastructure/secret/secret-manager.abstract";
import { Options } from 'jwks-rsa'
import { lastValueFrom } from "rxjs";
import { OAuth2Provider } from "../enums/oauth2-provider.enum";

@Injectable()
export class GoogleOAuth2Service extends OAuth2Service {
  public constructor(
    @Inject(CACHE) cache: Cache,
    userService: UserService,
    userRepository: UserRepository,
    http: HttpService,
    private readonly secret: SecretManager,
  ) {
    super(cache, userService, userRepository, http)
  }

  protected get provider(): OAuth2Provider {
    return OAuth2Provider.GOOGLE
  }

  protected get supportsPKCE(): boolean {
    return true;
  }

  protected get jwksOptions(): Options | null {
    return {
      jwksUri: "https://www.googleapis.com/oauth2/v3/certs",
    }
  }


  protected async buildAuthUrl(state: string, codeChallenge?: string): Promise<string> {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", await this.secret.getOrThrow("GOOGLE_CLIENT_ID"));
    url.searchParams.set("redirect_uri", await this.secret.getOrThrow("GOOGLE_REDIRECT_URI"));
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("state", state);

    if (codeChallenge) {
      url.searchParams.set("code_challenge", codeChallenge);
      url.searchParams.set("code_challenge_method", "S256");
    }

    return url.toString();
  }

  protected async getUserProfile(code: string, codeVerifier?: string): Promise<UserProfile> {
    const tokenUrl = new URL("https://oauth2.googleapis.com/token");
    tokenUrl.searchParams.append("code", code);
    tokenUrl.searchParams.append("client_id", await this.secret.getOrThrow("GOOGLE_CLIENT_ID"));
    tokenUrl.searchParams.append("client_secret", await this.secret.getOrThrow("GOOGLE_CLIENT_SECRET"));
    tokenUrl.searchParams.append("redirect_uri", await this.secret.getOrThrow("GOOGLE_REDIRECT_URI"));
    tokenUrl.searchParams.append("grant_type", "authorization_code");

    if (codeVerifier) {
      tokenUrl.searchParams.append("code_verifier", codeVerifier);
    }

    const tokenResponse = await lastValueFrom(
      this.http.post<GoogleGetTokenResponse>("https://oauth2.googleapis.com/token", tokenUrl.toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        }
      })
    );
    const userInfo = await this.verifyAndDecodeIdToken<GoogleJwtPayload>(tokenResponse.data.id_token, {
      audience: await this.secret.getOrThrow("GOOGLE_CLIENT_ID"),
    });

    return {
      avatarUrl: userInfo.picture,
      name: userInfo.name,
      email: userInfo.email,
    }
  }
}

export interface GoogleGetTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  token_type: string;
  id_token: string;
}

export interface GoogleJwtPayload {
  at_hash: string;
  azp: string;
  email: string;
  email_verified: boolean;
  family_name: string;
  given_name: string;
  name: string;
  picture: string;
}
