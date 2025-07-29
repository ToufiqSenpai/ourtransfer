import { Test, TestingModule } from "@nestjs/testing"
import { ConfigService } from "@nestjs/config"
import { SecretManager } from "../../secret/secret-manager.abstract"
import { AccessTokenJwtImpl } from "./access-token.jwt.impl"
import { mockDeep, DeepMockProxy } from "jest-mock-extended"
import * as jwt from "jsonwebtoken"
import { SecretNotFoundException } from "../../../common/exceptions/secret-not-found.exception"

// Mock the jsonwebtoken library
jest.mock("jsonwebtoken", () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}))

describe("AccessTokenJwtImpl", () => {
  let service: AccessTokenJwtImpl
  let mockConfigService: DeepMockProxy<ConfigService>
  let mockSecretManager: DeepMockProxy<SecretManager>

  const JWT_ISSUER_CONST = "ourtransfer-client" // Value from the class

  beforeEach(async () => {
    mockConfigService = mockDeep<ConfigService>()
    mockSecretManager = mockDeep<SecretManager>()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccessTokenJwtImpl,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: SecretManager, useValue: mockSecretManager },
      ],
    }).compile()

    service = module.get<AccessTokenJwtImpl>(AccessTokenJwtImpl)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("sign", () => {
    const userId = "test-user-id"
    const mockSecret = "super-secret-key"
    const mockAppDomain = "test.app.com"
    const mockSignedToken = "signed.jwt.token"

    it("should successfully sign a token and return it", async () => {
      mockSecretManager.getOrThrow.calledWith("ACCESS_TOKEN_SECRET").mockResolvedValue(mockSecret)
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      mockConfigService.get.calledWith("app.domain").mockReturnValue(mockAppDomain)
      ;(jwt.sign as jest.Mock).mockReturnValue(mockSignedToken)

      const token = await service.sign(userId)

      expect(mockSecretManager.getOrThrow).toHaveBeenCalledWith("ACCESS_TOKEN_SECRET")
      expect(mockConfigService.get).toHaveBeenCalledWith("app.domain")
      expect(jwt.sign).toHaveBeenCalledWith({ sub: userId }, mockSecret, {
        algorithm: "HS256",
        issuer: mockAppDomain,
        audience: JWT_ISSUER_CONST,
        expiresIn: "1h",
      })
      expect(token).toBe(mockSignedToken)
    })

    it("should throw SecretNotFoundException if secret manager fails to get secret", async () => {
      const secretError = new SecretNotFoundException("ACCESS_TOKEN_SECRET")
      mockSecretManager.getOrThrow.calledWith("ACCESS_TOKEN_SECRET").mockRejectedValue(secretError)

      await expect(service.sign(userId)).rejects.toThrow(SecretNotFoundException)
      expect(mockSecretManager.getOrThrow).toHaveBeenCalledWith("ACCESS_TOKEN_SECRET")
      expect(jwt.sign).not.toHaveBeenCalled()
    })

    it("should use undefined issuer if app.domain config is not set", async () => {
      mockSecretManager.getOrThrow.calledWith("ACCESS_TOKEN_SECRET").mockResolvedValue(mockSecret)
      // @ts-ignore
      mockConfigService.get.calledWith("app.domain").mockReturnValue(undefined) // Simulate config not found
      ;(jwt.sign as jest.Mock).mockReturnValue(mockSignedToken)

      await service.sign(userId)

      expect(jwt.sign).toHaveBeenCalledWith(
        { sub: userId },
        mockSecret,
        expect.objectContaining({
          issuer: undefined, // jsonwebtoken library handles undefined issuer
        }),
      )
    })
  })

  describe("verify", () => {
    const tokenToVerify = "some.jwt.token.to.verify"
    const mockSecret = "super-secret-key-for-verify"
    const mockAppDomain = "verify.app.com"
    const mockUserId = "verified-user-id"

    it("should successfully verify a token and return the user ID (sub)", async () => {
      mockSecretManager.getOrThrow.calledWith("ACCESS_TOKEN_SECRET").mockResolvedValue(mockSecret)
      // @ts-ignore
      mockConfigService.get.calledWith("app.domain").mockReturnValue(mockAppDomain)
      ;(jwt.verify as jest.Mock).mockReturnValue({ sub: mockUserId })

      const userId = await service.verify(tokenToVerify)

      expect(mockSecretManager.getOrThrow).toHaveBeenCalledWith("ACCESS_TOKEN_SECRET")
      expect(mockConfigService.get).toHaveBeenCalledWith("app.domain")
      expect(jwt.verify).toHaveBeenCalledWith(tokenToVerify, mockSecret, {
        algorithms: ["HS256"],
        issuer: mockAppDomain,
        audience: JWT_ISSUER_CONST,
      })
      expect(userId).toBe(mockUserId)
    })

    it("should return null if jwt.verify returns a string payload", async () => {
      mockSecretManager.getOrThrow.calledWith("ACCESS_TOKEN_SECRET").mockResolvedValue(mockSecret)
      // @ts-ignore
      mockConfigService.get.calledWith("app.domain").mockReturnValue(mockAppDomain)
      ;(jwt.verify as jest.Mock).mockReturnValue("string-payload-not-object")

      const userId = await service.verify(tokenToVerify)
      expect(userId).toBeNull()
    })

    it("should return null if jwt.verify returns an object payload without sub", async () => {
      mockSecretManager.getOrThrow.calledWith("ACCESS_TOKEN_SECRET").mockResolvedValue(mockSecret)
      // @ts-ignore
      mockConfigService.get.calledWith("app.domain").mockReturnValue(mockAppDomain)
      ;(jwt.verify as jest.Mock).mockReturnValue({ someOtherProp: "value" }) // No 'sub'

      const userId = await service.verify(tokenToVerify)
      expect(userId).toBeNull()
    })

    it("should return null if jwt.verify throws an error (e.g., TokenExpiredError, JsonWebTokenError)", async () => {
      mockSecretManager.getOrThrow.calledWith("ACCESS_TOKEN_SECRET").mockResolvedValue(mockSecret)
      // @ts-ignore
      mockConfigService.get.calledWith("app.domain").mockReturnValue(mockAppDomain)
      ;(jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error("JWT verification failed") // Simulates any error from jsonwebtoken
      })

      const userId = await service.verify(tokenToVerify)
      expect(userId).toBeNull()
      expect(jwt.verify).toHaveBeenCalled() // Ensure verify was called
    })

    it("should correctly handle verify when secret is retrieved but token is invalid", async () => {
      mockSecretManager.getOrThrow.calledWith("ACCESS_TOKEN_SECRET").mockResolvedValue(mockSecret)
      // @ts-ignore
      mockConfigService.get.calledWith("app.domain").mockReturnValue(mockAppDomain)
      ;(jwt.verify as jest.Mock).mockImplementation(() => {
        const error = new Error("Invalid token") as any
        error.name = "JsonWebTokenError" // Simulate a specific JWT error
        throw error
      })

      const userId = await service.verify(tokenToVerify)
      expect(userId).toBeNull()
      expect(jwt.verify).toHaveBeenCalled()
    })
  })
})
