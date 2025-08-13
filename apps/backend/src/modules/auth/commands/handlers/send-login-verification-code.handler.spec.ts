import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { mock, MockProxy } from 'jest-mock-extended'
import { faker } from '@faker-js/faker'
import { plainToInstance } from 'class-transformer'
import { SendLoginVerificationCodeHandler } from './send-login-verification-code.handler'
import { SendLoginVerificationCodeCommand } from '../send-login-verification-code.command'
import { SendLoginVerificationCodeDto, CommonResponseDto } from '@ourtransfer/dto'
import { LoginVerificationCodeService } from '../../services/login-verification-code.service'
import { UserRepository } from '../../../user/repositories/user.repository'
import { User } from '../../../user/entities/user.entity'

/**
 * Unit tests for SendLoginVerificationCodeHandler
 *
 * Tests the command handler responsible for sending login verification codes to users.
 * Covers successful code sending, user not found scenarios, and error propagation.
 */
describe('SendLoginVerificationCodeHandler', () => {
  let handler: SendLoginVerificationCodeHandler
  let loginVerificationCodeService: MockProxy<LoginVerificationCodeService>
  let userRepository: MockProxy<UserRepository>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SendLoginVerificationCodeHandler,
        {
          provide: LoginVerificationCodeService,
          useValue: mock<LoginVerificationCodeService>(),
        },
        {
          provide: UserRepository,
          useValue: mock<UserRepository>(),
        },
      ],
    }).compile()

    handler = module.get<SendLoginVerificationCodeHandler>(SendLoginVerificationCodeHandler)
    loginVerificationCodeService = module.get<MockProxy<LoginVerificationCodeService>>(LoginVerificationCodeService)
    userRepository = module.get<MockProxy<UserRepository>>(UserRepository)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('execute', () => {
    const createMockUser = (overrides: Partial<User> = {}): User => {
      return plainToInstance(User, {
        id: faker.string.uuid(),
        name: faker.person.fullName(),
        email: faker.internet.email(),
        password: faker.internet.password(),
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
        ...overrides,
      })
    }

    const createCommand = (email: string = faker.internet.email()): SendLoginVerificationCodeCommand => {
      const dto = plainToInstance(SendLoginVerificationCodeDto, { email })
      return new SendLoginVerificationCodeCommand(dto)
    }

    describe('successful scenarios', () => {
      it('should send verification code successfully when user exists', async () => {
        // Arrange
        const mockUser = createMockUser()
        const command = createCommand(mockUser.email)

        userRepository.findByEmail.mockResolvedValue(mockUser)
        loginVerificationCodeService.sendVerificationCode.mockResolvedValue()

        // Act
        const result = await handler.execute(command)

        // Assert
        expect(userRepository.findByEmail).toHaveBeenCalledWith(command.dto.email)
        expect(loginVerificationCodeService.sendVerificationCode).toHaveBeenCalledWith(mockUser)

        expect(result).toBeInstanceOf(CommonResponseDto)
        expect(result.message).toBe('A verification code has send to the email. Please check your inbox.')
      })

      it('should handle users with different email formats', async () => {
        // Arrange
        const testEmails = [
          'user@example.com',
          'test.user+tag@domain.co.uk',
          'user123@subdomain.example.org'
        ]

        for (const email of testEmails) {
          const mockUser = createMockUser({ email })
          const command = createCommand(email)

          userRepository.findByEmail.mockResolvedValue(mockUser)
          loginVerificationCodeService.sendVerificationCode.mockResolvedValue()

          // Act
          const result = await handler.execute(command)

          // Assert
          expect(userRepository.findByEmail).toHaveBeenCalledWith(email)
          expect(loginVerificationCodeService.sendVerificationCode).toHaveBeenCalledWith(mockUser)
          expect(result).toBeInstanceOf(CommonResponseDto)
          expect(result.message).toBe('A verification code has send to the email. Please check your inbox.')

          // Reset mocks for next iteration
          jest.clearAllMocks()
        }
      })

      it('should work with users having different properties', async () => {
        // Arrange
        const mockUser = createMockUser({
          password: undefined, // passwordless user
          twoFactorAuthentication: undefined,
        })
        const command = createCommand(mockUser.email)

        userRepository.findByEmail.mockResolvedValue(mockUser)
        loginVerificationCodeService.sendVerificationCode.mockResolvedValue()

        // Act
        const result = await handler.execute(command)

        // Assert
        expect(userRepository.findByEmail).toHaveBeenCalledWith(command.dto.email)
        expect(loginVerificationCodeService.sendVerificationCode).toHaveBeenCalledWith(mockUser)
        expect(result).toBeInstanceOf(CommonResponseDto)
        expect(result.message).toBe('A verification code has send to the email. Please check your inbox.')
      })
    })

    describe('failure scenarios', () => {
      it('should throw NotFoundException when user does not exist', async () => {
        // Arrange
        const command = createCommand('nonexistent@example.com')
        userRepository.findByEmail.mockResolvedValue(null)

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(
          new NotFoundException({
            message: 'User not found.'
          })
        )

        expect(userRepository.findByEmail).toHaveBeenCalledWith(command.dto.email)
        expect(loginVerificationCodeService.sendVerificationCode).not.toHaveBeenCalled()
      })

      it('should throw NotFoundException with correct structure when user not found', async () => {
        // Arrange
        const command = createCommand('missing@example.com')
        userRepository.findByEmail.mockResolvedValue(null)

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(NotFoundException)

        expect(loginVerificationCodeService.sendVerificationCode).not.toHaveBeenCalled()
      })
    })

    describe('error handling', () => {
      it('should propagate errors from userRepository.findByEmail', async () => {
        // Arrange
        const command = createCommand()
        const repositoryError = new Error(faker.lorem.sentence())
        userRepository.findByEmail.mockRejectedValue(repositoryError)

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(repositoryError)

        expect(userRepository.findByEmail).toHaveBeenCalledWith(command.dto.email)
        expect(loginVerificationCodeService.sendVerificationCode).not.toHaveBeenCalled()
      })

      it('should propagate errors from loginVerificationCodeService.sendVerificationCode', async () => {
        // Arrange
        const mockUser = createMockUser()
        const command = createCommand(mockUser.email)
        const serviceError = new Error(faker.lorem.sentence())

        userRepository.findByEmail.mockResolvedValue(mockUser)
        loginVerificationCodeService.sendVerificationCode.mockRejectedValue(serviceError)

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(serviceError)

        expect(userRepository.findByEmail).toHaveBeenCalledWith(command.dto.email)
        expect(loginVerificationCodeService.sendVerificationCode).toHaveBeenCalledWith(mockUser)
      })

      it('should handle database connection errors', async () => {
        // Arrange
        const command = createCommand()
        const dbError = new Error('Database connection failed')
        userRepository.findByEmail.mockRejectedValue(dbError)

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(dbError)
      })

      it('should handle email service errors', async () => {
        // Arrange
        const mockUser = createMockUser()
        const command = createCommand(mockUser.email)
        const emailError = new Error('Email service unavailable')

        userRepository.findByEmail.mockResolvedValue(mockUser)
        loginVerificationCodeService.sendVerificationCode.mockRejectedValue(emailError)

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(emailError)
      })
    })

    describe('edge cases', () => {
      it('should handle empty string email gracefully', async () => {
        // Arrange
        const command = createCommand('')
        userRepository.findByEmail.mockResolvedValue(null)

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(NotFoundException)

        expect(userRepository.findByEmail).toHaveBeenCalledWith('')
        expect(loginVerificationCodeService.sendVerificationCode).not.toHaveBeenCalled()
      })

      it('should handle null user response from repository', async () => {
        // Arrange
        const command = createCommand()
        userRepository.findByEmail.mockResolvedValue(null)

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(NotFoundException)
      })

      it('should handle undefined user response from repository', async () => {
        // Arrange
        const command = createCommand()
        userRepository.findByEmail.mockResolvedValue(undefined as any)

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow(NotFoundException)
      })
    })

    describe('integration behavior', () => {
      it('should call services in correct order', async () => {
        // Arrange
        const mockUser = createMockUser()
        const command = createCommand(mockUser.email)
        const callOrder: string[] = []

        userRepository.findByEmail.mockImplementation(async () => {
          callOrder.push('findByEmail')
          return mockUser
        })

        loginVerificationCodeService.sendVerificationCode.mockImplementation(async () => {
          callOrder.push('sendVerificationCode')
        })

        // Act
        await handler.execute(command)

        // Assert
        expect(callOrder).toEqual(['findByEmail', 'sendVerificationCode'])
      })

      it('should not call sendVerificationCode if user not found', async () => {
        // Arrange
        const command = createCommand()
        userRepository.findByEmail.mockResolvedValue(null)

        // Act & Assert
        try {
          await handler.execute(command)
        } catch {
          // Expected to throw
        }

        expect(userRepository.findByEmail).toHaveBeenCalledTimes(1)
        expect(loginVerificationCodeService.sendVerificationCode).not.toHaveBeenCalled()
      })
    })

    describe('response validation', () => {
      it('should return properly formatted CommonResponseDto', async () => {
        // Arrange
        const mockUser = createMockUser()
        const command = createCommand(mockUser.email)

        userRepository.findByEmail.mockResolvedValue(mockUser)
        loginVerificationCodeService.sendVerificationCode.mockResolvedValue()

        // Act
        const result = await handler.execute(command)

        // Assert
        expect(result).toBeInstanceOf(CommonResponseDto)
        expect(result).toHaveProperty('message')
        expect(typeof result.message).toBe('string')
        expect(result.message).toBe('A verification code has send to the email. Please check your inbox.')
      })

      it('should return consistent message format', async () => {
        // Arrange
        const mockUser = createMockUser()
        const command = createCommand(mockUser.email)

        userRepository.findByEmail.mockResolvedValue(mockUser)
        loginVerificationCodeService.sendVerificationCode.mockResolvedValue()

        // Act
        const result1 = await handler.execute(command)
        const result2 = await handler.execute(command)

        // Assert
        expect(result1.message).toBe(result2.message)
        expect(result1.message).toBe('A verification code has send to the email. Please check your inbox.')
      })
    })
  })
})
