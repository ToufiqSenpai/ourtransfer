import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { mock, MockProxy } from 'jest-mock-extended'
import { faker } from '@faker-js/faker'
import { plainToInstance } from 'class-transformer'
import { LoginVerificationCodeService } from './login-verification-code.service'
import { TEXT_HASHER, TextHasher } from '../../../infrastructure/security/hash/text-hasher.interface'
import { LoginVerificationCodeRepository } from '../repositories/login-verification-code.repository'
import { EmailService } from '../../../infrastructure/email/email.service'
import { User } from '../../user/entities/user.entity'
import { LoginVerificationCode } from '../entities/login-verification-code.entity'

/**
 * Unit tests for LoginVerificationCodeService
 *
 * Tests the service responsible for managing login verification codes:
 * - Generating and sending verification codes via email
 * - Verifying submitted codes and revoking them after use
 */
describe('LoginVerificationCodeService', () => {
  let service: LoginVerificationCodeService
  let textHasher: MockProxy<TextHasher>
  let loginVerificationCodeRepository: MockProxy<LoginVerificationCodeRepository>
  let emailService: MockProxy<EmailService>
  let configService: MockProxy<ConfigService>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginVerificationCodeService,
        {
          provide: TEXT_HASHER,
          useValue: mock<TextHasher>(),
        },
        {
          provide: LoginVerificationCodeRepository,
          useValue: mock<LoginVerificationCodeRepository>(),
        },
        {
          provide: EmailService,
          useValue: mock<EmailService>(),
        },
        {
          provide: ConfigService,
          useValue: mock<ConfigService>(),
        },
      ],
    }).compile()

    service = module.get<LoginVerificationCodeService>(LoginVerificationCodeService)
    textHasher = module.get(TEXT_HASHER)
    loginVerificationCodeRepository = module.get<MockProxy<LoginVerificationCodeRepository>>(LoginVerificationCodeRepository)
    emailService = module.get<MockProxy<EmailService>>(EmailService)
    configService = module.get<MockProxy<ConfigService>>(ConfigService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('sendVerificationCode', () => {
    const createMockUser = (overrides: Partial<User> = {}): User => {
      return plainToInstance(User, {
        id: faker.string.uuid(),
        name: faker.person.fullName(),
        email: faker.internet.email(),
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
        ...overrides,
      })
    }

    const createMockVerificationCode = (overrides: Partial<LoginVerificationCode> = {}): LoginVerificationCode => {
      return plainToInstance(LoginVerificationCode, {
        id: faker.string.uuid(),
        code: faker.string.alphanumeric(64),
        revoked: false,
        expiresAt: faker.date.future(),
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
        ...overrides,
      })
    }

    describe('successful code generation and sending', () => {
      it('should generate and send verification code successfully', async () => {
        // Arrange
        const mockUser = createMockUser()
        const mockHashedCode = faker.string.alphanumeric(64)
        const mockExpiresIn = 300 // 5 minutes in seconds

        textHasher.hash.mockResolvedValue(mockHashedCode)
        configService.getOrThrow.mockReturnValue(mockExpiresIn)
        loginVerificationCodeRepository.save.mockResolvedValue(createMockVerificationCode())
        emailService.sendEmail.mockResolvedValue()

        // Act
        await service.sendVerificationCode(mockUser)

        // Assert
        expect(textHasher.hash).toHaveBeenCalledWith(expect.stringMatching(/^\d{6}$/)) // 6-digit code
        expect(configService.getOrThrow).toHaveBeenCalledWith('auth.loginVerificationCode.expiresIn')
        expect(loginVerificationCodeRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            code: mockHashedCode,
            user: mockUser,
            expiresAt: expect.any(Date),
          })
        )
        expect(emailService.sendEmail).toHaveBeenCalledWith(
          mockUser.email,
          'Your Verification Code',
          {
            name: 'login-verification-code',
            payload: { code: expect.stringMatching(/^\d{6}$/) },
          }
        )
      })

      it('should generate 6-digit codes within valid range', async () => {
        // Arrange
        const mockUser = createMockUser()
        const mockHashedCode = faker.string.alphanumeric(64)
        const mockExpiresIn = 600

        textHasher.hash.mockResolvedValue(mockHashedCode)
        configService.getOrThrow.mockReturnValue(mockExpiresIn)
        loginVerificationCodeRepository.save.mockResolvedValue(createMockVerificationCode())
        emailService.sendEmail.mockResolvedValue()

        // Act
        await service.sendVerificationCode(mockUser)

        // Assert
        const hashCall = textHasher.hash.mock.calls[0][0]
        const code = parseInt(hashCall, 10)
        expect(code).toBeGreaterThanOrEqual(100000)
        expect(code).toBeLessThan(1000000)
        expect(hashCall).toMatch(/^\d{6}$/)
      })

      it('should set correct expiration time based on config', async () => {
        // Arrange
        const mockUser = createMockUser()
        const mockHashedCode = faker.string.alphanumeric(64)
        const mockExpiresIn = 900 // 15 minutes
        const beforeTime = Date.now()

        textHasher.hash.mockResolvedValue(mockHashedCode)
        configService.getOrThrow.mockReturnValue(mockExpiresIn)
        loginVerificationCodeRepository.save.mockResolvedValue(createMockVerificationCode())
        emailService.sendEmail.mockResolvedValue()

        // Act
        await service.sendVerificationCode(mockUser)
        const afterTime = Date.now()

        // Assert
        const savedCode = loginVerificationCodeRepository.save.mock.calls[0][0]
        const expectedMinTime = new Date(beforeTime + mockExpiresIn * 1000)
        const expectedMaxTime = new Date(afterTime + mockExpiresIn * 1000)

        expect(savedCode.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMinTime.getTime())
        expect(savedCode.expiresAt.getTime()).toBeLessThanOrEqual(expectedMaxTime.getTime())
      })

      it('should handle different user email formats', async () => {
        // Arrange
        const testEmails = [
          'user@example.com',
          'test.user+tag@domain.co.uk',
          'user123@subdomain.example.org'
        ]

        for (const email of testEmails) {
          const mockUser = createMockUser({ email })
          const mockHashedCode = faker.string.alphanumeric(64)

          textHasher.hash.mockResolvedValue(mockHashedCode)
          configService.getOrThrow.mockReturnValue(300)
          loginVerificationCodeRepository.save.mockResolvedValue(createMockVerificationCode())
          emailService.sendEmail.mockResolvedValue()

          // Act
          await service.sendVerificationCode(mockUser)

          // Assert
          expect(emailService.sendEmail).toHaveBeenCalledWith(
            email,
            'Your Verification Code',
            expect.any(Object)
          )

          // Reset mocks for next iteration
          jest.clearAllMocks()
        }
      })
    })

    describe('error handling', () => {
      it('should propagate errors from textHasher.hash', async () => {
        // Arrange
        const mockUser = createMockUser()
        const hashError = new Error('Hash service unavailable')

        textHasher.hash.mockRejectedValue(hashError)

        // Act & Assert
        await expect(service.sendVerificationCode(mockUser)).rejects.toThrow(hashError)
        expect(loginVerificationCodeRepository.save).not.toHaveBeenCalled()
        expect(emailService.sendEmail).not.toHaveBeenCalled()
      })

      it('should propagate errors from repository.save', async () => {
        // Arrange
        const mockUser = createMockUser()
        const mockHashedCode = faker.string.alphanumeric(64)
        const repositoryError = new Error('Database connection failed')

        textHasher.hash.mockResolvedValue(mockHashedCode)
        configService.getOrThrow.mockReturnValue(300)
        loginVerificationCodeRepository.save.mockRejectedValue(repositoryError)

        // Act & Assert
        await expect(service.sendVerificationCode(mockUser)).rejects.toThrow(repositoryError)
        expect(emailService.sendEmail).not.toHaveBeenCalled()
      })

      it('should propagate errors from emailService.sendEmail', async () => {
        // Arrange
        const mockUser = createMockUser()
        const mockHashedCode = faker.string.alphanumeric(64)
        const emailError = new Error('Email service unavailable')

        textHasher.hash.mockResolvedValue(mockHashedCode)
        configService.getOrThrow.mockReturnValue(300)
        loginVerificationCodeRepository.save.mockResolvedValue(createMockVerificationCode())
        emailService.sendEmail.mockRejectedValue(emailError)

        // Act & Assert
        await expect(service.sendVerificationCode(mockUser)).rejects.toThrow(emailError)
      })

      it('should propagate errors from configService.getOrThrow', async () => {
        // Arrange
        const mockUser = createMockUser()
        const configError = new Error('Configuration not found')

        configService.getOrThrow.mockImplementation(() => {
          throw configError
        })

        // Act & Assert
        await expect(service.sendVerificationCode(mockUser)).rejects.toThrow(configError)
        expect(textHasher.hash).toHaveBeenCalled()
      })
    })
  })

  describe('verifyCode', () => {
    const createMockUser = (overrides: Partial<User> = {}): User => {
      return plainToInstance(User, {
        id: faker.string.uuid(),
        name: faker.person.fullName(),
        email: faker.internet.email(),
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
        ...overrides,
      })
    }

    const createMockVerificationCode = (overrides: Partial<LoginVerificationCode> = {}): LoginVerificationCode => {
      const code = plainToInstance(LoginVerificationCode, {
        id: faker.string.uuid(),
        code: faker.string.alphanumeric(64),
        revoked: false,
        expiresAt: faker.date.future(),
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
        revoke: jest.fn(),
        ...overrides,
      })

      // Mock the revoke method
      code.revoke = jest.fn().mockImplementation(() => {
        code.revoked = true
        code.revokedAt = new Date()
      })

      return code
    }

    describe('successful verification', () => {
      it('should verify valid, non-expired, non-revoked code', async () => {
        // Arrange
        const mockUser = createMockUser()
        const submittedCode = '123456'
        const hashedCode = faker.string.alphanumeric(64)
        const mockVerificationCode = createMockVerificationCode({
          code: hashedCode,
          revoked: false,
          expiresAt: new Date(Date.now() + 300000), // 5 minutes from now
        })

        textHasher.hash.mockResolvedValue(hashedCode)
        loginVerificationCodeRepository.findByUserId.mockResolvedValue([mockVerificationCode])

        // Act
        const result = await service.verifyCode(mockUser, submittedCode)

        // Assert
        expect(result).toBe(true)
        expect(textHasher.hash).toHaveBeenCalledWith(submittedCode)
        expect(loginVerificationCodeRepository.findByUserId).toHaveBeenCalledWith(mockUser.id)
        expect(mockVerificationCode.revoke).toHaveBeenCalled()
        expect(loginVerificationCodeRepository.update).toHaveBeenCalledWith(mockVerificationCode.id, mockVerificationCode)
      })

      it('should find and verify the correct code among multiple codes', async () => {
        // Arrange
        const mockUser = createMockUser()
        const submittedCode = '654321'
        const correctHashedCode = faker.string.alphanumeric(64)
        const incorrectHashedCode = faker.string.alphanumeric(64)

        const mockVerificationCodes = [
          createMockVerificationCode({
            code: incorrectHashedCode,
            revoked: false,
            expiresAt: new Date(Date.now() + 300000),
          }),
          createMockVerificationCode({
            code: correctHashedCode,
            revoked: false,
            expiresAt: new Date(Date.now() + 300000),
          }),
          createMockVerificationCode({
            code: faker.string.alphanumeric(64),
            revoked: false,
            expiresAt: new Date(Date.now() + 300000),
          }),
        ]

        textHasher.hash.mockResolvedValue(correctHashedCode)
        loginVerificationCodeRepository.findByUserId.mockResolvedValue(mockVerificationCodes)

        // Act
        const result = await service.verifyCode(mockUser, submittedCode)

        // Assert
        expect(result).toBe(true)
        expect(mockVerificationCodes[0].revoke).not.toHaveBeenCalled()
        expect(mockVerificationCodes[1].revoke).toHaveBeenCalled()
        expect(mockVerificationCodes[2].revoke).not.toHaveBeenCalled()
        expect(loginVerificationCodeRepository.update).toHaveBeenCalledWith(mockVerificationCodes[1].id, mockVerificationCodes[1])
      })
    })

    describe('verification failures', () => {
      it('should return false when no matching code is found', async () => {
        // Arrange
        const mockUser = createMockUser()
        const submittedCode = '111111'
        const hashedCode = faker.string.alphanumeric(64)
        const differentHashedCode = faker.string.alphanumeric(64)

        const mockVerificationCode = createMockVerificationCode({
          code: differentHashedCode, // Different from hashed submitted code
          revoked: false,
          expiresAt: new Date(Date.now() + 300000),
        })

        textHasher.hash.mockResolvedValue(hashedCode)
        loginVerificationCodeRepository.findByUserId.mockResolvedValue([mockVerificationCode])

        // Act
        const result = await service.verifyCode(mockUser, submittedCode)

        // Assert
        expect(result).toBe(false)
        expect(mockVerificationCode.revoke).not.toHaveBeenCalled()
        expect(loginVerificationCodeRepository.update).not.toHaveBeenCalled()
      })

      it('should return false when code is expired', async () => {
        // Arrange
        const mockUser = createMockUser()
        const submittedCode = '222222'
        const hashedCode = faker.string.alphanumeric(64)

        const mockVerificationCode = createMockVerificationCode({
          code: hashedCode,
          revoked: false,
          expiresAt: new Date(Date.now() - 1000), // 1 second ago (expired)
        })

        textHasher.hash.mockResolvedValue(hashedCode)
        loginVerificationCodeRepository.findByUserId.mockResolvedValue([mockVerificationCode])

        // Act
        const result = await service.verifyCode(mockUser, submittedCode)

        // Assert
        expect(result).toBe(false)
        expect(mockVerificationCode.revoke).not.toHaveBeenCalled()
        expect(loginVerificationCodeRepository.update).not.toHaveBeenCalled()
      })

      it('should return false when code is already revoked', async () => {
        // Arrange
        const mockUser = createMockUser()
        const submittedCode = '333333'
        const hashedCode = faker.string.alphanumeric(64)

        const mockVerificationCode = createMockVerificationCode({
          code: hashedCode,
          revoked: true, // Already revoked
          expiresAt: new Date(Date.now() + 300000),
        })

        textHasher.hash.mockResolvedValue(hashedCode)
        loginVerificationCodeRepository.findByUserId.mockResolvedValue([mockVerificationCode])

        // Act
        const result = await service.verifyCode(mockUser, submittedCode)

        // Assert
        expect(result).toBe(false)
        expect(mockVerificationCode.revoke).not.toHaveBeenCalled()
        expect(loginVerificationCodeRepository.update).not.toHaveBeenCalled()
      })

      it('should return false when no verification codes exist for user', async () => {
        // Arrange
        const mockUser = createMockUser()
        const submittedCode = '444444'
        const hashedCode = faker.string.alphanumeric(64)

        textHasher.hash.mockResolvedValue(hashedCode)
        loginVerificationCodeRepository.findByUserId.mockResolvedValue([]) // No codes

        // Act
        const result = await service.verifyCode(mockUser, submittedCode)

        // Assert
        expect(result).toBe(false)
        expect(loginVerificationCodeRepository.update).not.toHaveBeenCalled()
      })

      it('should return false when code matches but multiple conditions fail', async () => {
        // Arrange
        const mockUser = createMockUser()
        const submittedCode = '555555'
        const hashedCode = faker.string.alphanumeric(64)

        const mockVerificationCode = createMockVerificationCode({
          code: hashedCode,
          revoked: true, // Revoked
          expiresAt: new Date(Date.now() - 1000), // And expired
        })

        textHasher.hash.mockResolvedValue(hashedCode)
        loginVerificationCodeRepository.findByUserId.mockResolvedValue([mockVerificationCode])

        // Act
        const result = await service.verifyCode(mockUser, submittedCode)

        // Assert
        expect(result).toBe(false)
        expect(mockVerificationCode.revoke).not.toHaveBeenCalled()
        expect(loginVerificationCodeRepository.update).not.toHaveBeenCalled()
      })
    })

    describe('error handling', () => {
      it('should propagate errors from textHasher.hash', async () => {
        // Arrange
        const mockUser = createMockUser()
        const submittedCode = '666666'
        const hashError = new Error('Hash service unavailable')

        textHasher.hash.mockRejectedValue(hashError)

        // Act & Assert
        await expect(service.verifyCode(mockUser, submittedCode)).rejects.toThrow(hashError)
        expect(loginVerificationCodeRepository.findByUserId).not.toHaveBeenCalled()
      })

      it('should propagate errors from repository.findByUserId', async () => {
        // Arrange
        const mockUser = createMockUser()
        const submittedCode = '777777'
        const hashedCode = faker.string.alphanumeric(64)
        const repositoryError = new Error('Database query failed')

        textHasher.hash.mockResolvedValue(hashedCode)
        loginVerificationCodeRepository.findByUserId.mockRejectedValue(repositoryError)

        // Act & Assert
        await expect(service.verifyCode(mockUser, submittedCode)).rejects.toThrow(repositoryError)
      })

      it('should propagate errors from repository.update', async () => {
        // Arrange
        const mockUser = createMockUser()
        const submittedCode = '888888'
        const hashedCode = faker.string.alphanumeric(64)
        const updateError = new Error('Database update failed')

        const mockVerificationCode = createMockVerificationCode({
          code: hashedCode,
          revoked: false,
          expiresAt: new Date(Date.now() + 300000),
        })

        textHasher.hash.mockResolvedValue(hashedCode)
        loginVerificationCodeRepository.findByUserId.mockResolvedValue([mockVerificationCode])
        loginVerificationCodeRepository.update.mockRejectedValue(updateError)

        // Act & Assert
        await expect(service.verifyCode(mockUser, submittedCode)).rejects.toThrow(updateError)
        expect(mockVerificationCode.revoke).toHaveBeenCalled()
      })
    })

    describe('edge cases', () => {
      it('should handle empty code input', async () => {
        // Arrange
        const mockUser = createMockUser()
        const submittedCode = ''
        const hashedCode = faker.string.alphanumeric(64)

        textHasher.hash.mockResolvedValue(hashedCode)
        loginVerificationCodeRepository.findByUserId.mockResolvedValue([])

        // Act
        const result = await service.verifyCode(mockUser, submittedCode)

        // Assert
        expect(result).toBe(false)
        expect(textHasher.hash).toHaveBeenCalledWith('')
      })

      it('should handle very long code input', async () => {
        // Arrange
        const mockUser = createMockUser()
        const submittedCode = '1'.repeat(1000)
        const hashedCode = faker.string.alphanumeric(64)

        textHasher.hash.mockResolvedValue(hashedCode)
        loginVerificationCodeRepository.findByUserId.mockResolvedValue([])

        // Act
        const result = await service.verifyCode(mockUser, submittedCode)

        // Assert
        expect(result).toBe(false)
        expect(textHasher.hash).toHaveBeenCalledWith(submittedCode)
      })

      it('should handle codes that expire exactly at verification time', async () => {
        // Arrange
        const mockUser = createMockUser()
        const submittedCode = '999999'
        const hashedCode = faker.string.alphanumeric(64)

        // Set expiration to 1ms in the past to simulate just expired
        const expiredTime = new Date(Date.now() - 1)

        const mockVerificationCode = createMockVerificationCode({
          code: hashedCode,
          revoked: false,
          expiresAt: expiredTime,
        })

        textHasher.hash.mockResolvedValue(hashedCode)
        loginVerificationCodeRepository.findByUserId.mockResolvedValue([mockVerificationCode])

        // Act
        const result = await service.verifyCode(mockUser, submittedCode)

        // Assert
        expect(result).toBe(false)
        expect(mockVerificationCode.revoke).not.toHaveBeenCalled()
        expect(loginVerificationCodeRepository.update).not.toHaveBeenCalled()
      })
    })
  })
})
