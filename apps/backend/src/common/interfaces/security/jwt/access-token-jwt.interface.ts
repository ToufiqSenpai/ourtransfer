import { Jwt } from './jwt.interface'

export const ACCESS_TOKEN_JWT = Symbol('AccessTokenJwt')

export type AccessTokenJwt = Jwt
