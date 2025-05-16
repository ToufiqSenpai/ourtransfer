import { SignJWT } from "jose";
import { Jwt } from "../../common/interfaces/jwt.interface";

export class JoseJwt implements Jwt {
  public async signAccessToken(userId: string): Promise<string> {
    return await new SignJWT({ sub: userId })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer()
  }

  public async verifyAccessToken(token: string): Promise<string | null> {

  }
}
