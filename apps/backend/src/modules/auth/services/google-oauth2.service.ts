import { OAuth2Service, UserProfile } from "./oauth2.service";
import { Inject, Injectable } from "@nestjs/common";
import { CACHE, Cache } from "../../../infrastructure/cache/cache.interface";
import { UserService } from "../../user/services/user.service";
import { UserRepository } from "../../user/repositories/user.repository";
import { HttpService } from "@nestjs/axios";
import { SecretManager } from "../../../infrastructure/secret/secret-manager.abstract";
import * as jwt from 'jsonwebtoken'
import { JwksClient } from 'jwks-rsa'
import { lastValueFrom } from "rxjs";
import { OAuth2Provider } from "../enums/oauth2-provider.enum";

@Injectable()
export class GoogleOAuth2Service extends OAuth2Service {
  private readonly jwksClient: JwksClient

  public constructor(
    @Inject(CACHE) cache: Cache,
    userService: UserService,
    userRepository: UserRepository,
    http: HttpService,
    private readonly secret: SecretManager,
  ) {
    super(cache, userService, userRepository, http)

    this.jwksClient = new JwksClient({
      jwksUri: "https://www.googleapis.com/oauth2/v3/certs"
    })
  }

  protected get provider(): OAuth2Provider {
    return OAuth2Provider.GOOGLE
  }

  protected get supportsPKCE(): boolean {
    return true;
  }

  protected async buildAuthUrl(state: string, codeChallenge?: string): Promise<string> {
    const baseUrl = "https://accounts.google.com/o/oauth2/v2/auth";
    const params = new URLSearchParams({
      client_id: await this.secret.getOrThrow("GOOGLE_CLIENT_ID"),
      redirect_uri: await this.secret.getOrThrow("GOOGLE_REDIRECT_URI"),
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "consent",
      state,
      ...(codeChallenge && { code_challenge: codeChallenge, code_challenge_method: "S256" }),
    });

    return `${baseUrl}?${params.toString()}`;
  }

  protected async getUserProfile(code: string, codeVerifier?: string): Promise<UserProfile> {
    const tokenQueryString = new URLSearchParams({
      code,
      client_id: await this.secret.getOrThrow("GOOGLE_CLIENT_ID"),
      client_secret: await this.secret.getOrThrow("GOOGLE_CLIENT_SECRET"),
      redirect_uri: await this.secret.getOrThrow("GOOGLE_REDIRECT_URI"),
      grant_type: "authorization_code",
      ...(codeVerifier && { code_verifier: codeVerifier }),
    })
    const tokenResponse = await lastValueFrom(this.http.post<GoogleGetTokenResponse, string>("https://oauth2.googleapis.com/token", tokenQueryString.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      }
    }))

    const decodedHeader = jwt.decode(tokenResponse.data.id_token, { complete: true }) as jwt.Jwt

    if (!decodedHeader.header.kid) {
      throw new Error("Invalid ID token header");
    }

    const signingKey = await this.jwksClient.getSigningKey(decodedHeader.header.kid)
    const verifiedJwt = jwt.verify(tokenResponse.data.id_token, signingKey.getPublicKey(), {
      audience: await this.secret.getOrThrow("GOOGLE_CLIENT_ID"),
    }) as jwt.JwtPayload & GoogleJwtPayload


    return {
      avatarUrl: verifiedJwt.picture,
      name: verifiedJwt.name,
      email: verifiedJwt.email,
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
