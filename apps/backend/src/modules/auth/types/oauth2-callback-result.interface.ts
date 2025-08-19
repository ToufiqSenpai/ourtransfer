import { OAuth2Platform } from "../enums/oauth2-platform.enum";

export interface OAuth2CallbackResult {
  platform: OAuth2Platform
  refreshToken?: string
}
