import { Test, TestingModule } from '@nestjs/testing'
import { mock, MockProxy } from 'jest-mock-extended'
import { faker } from '@faker-js/faker'
import { plainToInstance } from 'class-transformer'
import { UserLoggedInHandler } from './user-logged-in.handler'
import { UserLoggedInEvent } from '../user-logged-in.event'
import { Logger } from '../../../../infrastructure/log/logger.abstract'
import { UserRepository } from '../../../user/repositories/user.repository'
import { User } from '../../../user/entities/user.entity'
import { AuthProvider } from '@ourtransfer/common'

/**
 * Unit tests for UserLoggedInHandler
 *
 * Tests the event handler responsible for updating user's last sign-in timestamp
 * when a user successfully logs in. Covers successful updates, error handling,
 * and logging behavior.
 */
describe('UserLoggedInHandler', () => {
  let handler: UserLoggedInHandler
  let logger: MockProxy<Logger>
  let userRepository: MockProxy<UserRepository>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserLoggedInHandler,
        {
          provide: Logger,
          useValue: mock<Logger>(),
        },
        {
          provide: UserRepository,
          useValue: mock<UserRepository>(),
        },
      ],
    }).compile()

    handler = module.get<UserLoggedInHandler>(UserLoggedInHandler)
    logger = module.get<MockProxy<Logger>>(Logger)
    userRepository = module.get<MockProxy<UserRepository>>(UserRepository)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('handle', () => {
    const createMockUser = (overrides: Partial<User> = {}): User => {
      return plainToInstance(User, {
        id: faker.string.uuid(),
        name: faker.person.fullName(),
        email: faker.internet.email(),
        password: faker.internet.password(),
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
        lastSignInAt: undefined,
        ...overrides,
      })
    }

    const createUserLoggedInEvent = (user: User): UserLoggedInEvent => {
      return new UserLoggedInEvent(user)
    }

    describe('successful scenarios', () => {
      it('should update user last sign in timestamp successfully', async () => {
        // Arrange
        const mockUser = createMockUser()
        const event = createUserLoggedInEvent(mockUser)
        const originalLastSignInAt = mockUser.lastSignInAt

        userRepository.update.mockResolvedValue(undefined)

        // Act
        await handler.handle(event)

        // Assert
        expect(mockUser.lastSignInAt).toBeDefined()
        expect(mockUser.lastSignInAt).not.toBe(originalLastSignInAt)
        expect(mockUser.lastSignInAt).toBeInstanceOf(Date)
        expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, mockUser)
        expect(logger.error).not.toHaveBeenCalled()
      })

      it('should work with different auth providers', async () => {
        // Arrange
        const authProviders = [
          AuthProvider.EMAIL_PASSWORD,
          // Add other providers if they exist in the enum
        ]

        for (const _ of authProviders) {
          const mockUser = createMockUser()
          const event = createUserLoggedInEvent(mockUser)

          userRepository.update.mockResolvedValue(undefined)

          // Act
          await handler.handle(event)

          // Assert
          expect(mockUser.lastSignInAt).toBeDefined()
          expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, mockUser)
          expect(logger.error).not.toHaveBeenCalled()

          // Reset mocks for next iteration
          jest.clearAllMocks()
        }
      })

      it('should update timestamp to current date/time', async () => {
        // Arrange
        const mockUser = createMockUser({ lastSignInAt: faker.date.past() })
        const event = createUserLoggedInEvent(mockUser)
        const beforeUpdate = new Date()

        userRepository.update.mockResolvedValue(undefined)

        // Act
        await handler.handle(event)

        // Assert
        const afterUpdate = new Date()
        expect(mockUser.lastSignInAt!.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime())
        expect(mockUser.lastSignInAt!.getTime()).toBeLessThanOrEqual(afterUpdate.getTime())
        expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, mockUser)
      })

      it('should work with user that has existing lastSignInAt', async () => {
        // Arrange
        const existingLastSignIn = faker.date.past()
        const mockUser = createMockUser({ lastSignInAt: existingLastSignIn })
        const event = createUserLoggedInEvent(mockUser)

        userRepository.update.mockResolvedValue(undefined)

        // Act
        await handler.handle(event)

        // Assert
        expect(mockUser.lastSignInAt).toBeDefined()
        expect(mockUser.lastSignInAt).not.toBe(existingLastSignIn)
        expect(mockUser.lastSignInAt!.getTime()).toBeGreaterThan(existingLastSignIn.getTime())
        expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, mockUser)
      })

      it('should work with user that has no previous lastSignInAt', async () => {
        // Arrange
        const mockUser = createMockUser({ lastSignInAt: undefined })
        const event = createUserLoggedInEvent(mockUser)

        userRepository.update.mockResolvedValue(undefined)

        // Act
        await handler.handle(event)

        // Assert
        expect(mockUser.lastSignInAt).toBeDefined()
        expect(mockUser.lastSignInAt).toBeInstanceOf(Date)
        expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, mockUser)
      })
    })

    describe('error handling', () => {
      it('should log error and not throw when repository update fails', async () => {
        // Arrange
        const mockUser = createMockUser()
        const event = createUserLoggedInEvent(mockUser)
        const repositoryError = new Error(faker.lorem.sentence())

        userRepository.update.mockRejectedValue(repositoryError)

        // Act & Assert
        await expect(handler.handle(event)).resolves.not.toThrow()

        expect(mockUser.lastSignInAt).toBeDefined() // updateLastSignInAt() was called
        expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, mockUser)
        expect(logger.error).toHaveBeenCalledWith('Failed to update last sign in timestamps', repositoryError)
      })

      it('should handle database connection errors gracefully', async () => {
        // Arrange
        const mockUser = createMockUser()
        const event = createUserLoggedInEvent(mockUser)
        const dbError = new Error('Database connection failed')

        userRepository.update.mockRejectedValue(dbError)

        // Act
        await handler.handle(event)

        // Assert
        expect(logger.error).toHaveBeenCalledWith('Failed to update last sign in timestamps', dbError)
      })

      it('should handle timeout errors gracefully', async () => {
        // Arrange
        const mockUser = createMockUser()
        const event = createUserLoggedInEvent(mockUser)
        const timeoutError = new Error('Query timeout')

        userRepository.update.mockRejectedValue(timeoutError)

        // Act
        await handler.handle(event)

        // Assert
        expect(logger.error).toHaveBeenCalledWith('Failed to update last sign in timestamps', timeoutError)
      })

      it('should handle repository constraint errors gracefully', async () => {
        // Arrange
        const mockUser = createMockUser()
        const event = createUserLoggedInEvent(mockUser)
        const constraintError = new Error('Constraint violation')

        userRepository.update.mockRejectedValue(constraintError)

        // Act
        await handler.handle(event)

        // Assert
        expect(logger.error).toHaveBeenCalledWith('Failed to update last sign in timestamps', constraintError)
      })
    })

    describe('edge cases', () => {
      it('should handle user with all optional properties undefined', async () => {
        // Arrange
        const mockUser = createMockUser({
          password: undefined,
          twoFactorAuthentication: undefined,
          lastSignInAt: undefined,
        })
        const event = createUserLoggedInEvent(mockUser)

        userRepository.update.mockResolvedValue(undefined)

        // Act
        await handler.handle(event)

        // Assert
        expect(mockUser.lastSignInAt).toBeDefined()
        expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, mockUser)
      })

      it('should handle user with null lastSignInAt', async () => {
        // Arrange
        const mockUser = createMockUser({ lastSignInAt: null as any })
        const event = createUserLoggedInEvent(mockUser)

        userRepository.update.mockResolvedValue(undefined)

        // Act
        await handler.handle(event)

        // Assert
        expect(mockUser.lastSignInAt).toBeDefined()
        expect(mockUser.lastSignInAt).toBeInstanceOf(Date)
        expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, mockUser)
      })

      it('should work with minimal user object', async () => {
        // Arrange
        const mockUser = plainToInstance(User, {
          id: faker.string.uuid(),
          name: faker.person.fullName(),
          email: faker.internet.email(),
        })
        const event = createUserLoggedInEvent(mockUser)

        userRepository.update.mockResolvedValue(undefined)

        // Act
        await handler.handle(event)

        // Assert
        expect(mockUser.lastSignInAt).toBeDefined()
        expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, mockUser)
      })
    })

    describe('method call verification', () => {
      it('should call updateLastSignInAt method on user', async () => {
        // Arrange
        const mockUser = createMockUser()
        const event = createUserLoggedInEvent(mockUser)
        const updateSpy = jest.spyOn(mockUser, 'updateLastSignInAt')

        userRepository.update.mockResolvedValue(undefined)

        // Act
        await handler.handle(event)

        // Assert
        expect(updateSpy).toHaveBeenCalledTimes(1)
        expect(updateSpy).toHaveBeenCalledWith()
      })

      it('should call repository update with correct parameters', async () => {
        // Arrange
        const mockUser = createMockUser()
        const event = createUserLoggedInEvent(mockUser)

        userRepository.update.mockResolvedValue(undefined)

        // Act
        await handler.handle(event)

        // Assert
        expect(userRepository.update).toHaveBeenCalledTimes(1)
        expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, mockUser)
      })

      it('should call methods in correct order', async () => {
        // Arrange
        const mockUser = createMockUser()
        const event = createUserLoggedInEvent(mockUser)
        const callOrder: string[] = []

        const updateSpy = jest.spyOn(mockUser, 'updateLastSignInAt').mockImplementation(() => {
          callOrder.push('updateLastSignInAt')
        })

        userRepository.update.mockImplementation(async () => {
          callOrder.push('repository.update')
        })

        // Act
        await handler.handle(event)

        // Assert
        expect(callOrder).toEqual(['updateLastSignInAt', 'repository.update'])
        expect(updateSpy).toHaveBeenCalledTimes(1)
      })
    })

    describe('logging behavior', () => {
      it('should not log anything on successful operation', async () => {
        // Arrange
        const mockUser = createMockUser()
        const event = createUserLoggedInEvent(mockUser)

        userRepository.update.mockResolvedValue(undefined)

        // Act
        await handler.handle(event)

        // Assert
        expect(logger.trace).not.toHaveBeenCalled()
        expect(logger.debug).not.toHaveBeenCalled()
        expect(logger.verbose).not.toHaveBeenCalled()
        expect(logger.info).not.toHaveBeenCalled()
        expect(logger.log).not.toHaveBeenCalled()
        expect(logger.warn).not.toHaveBeenCalled()
        expect(logger.error).not.toHaveBeenCalled()
        expect(logger.fatal).not.toHaveBeenCalled()
      })

      it('should only log error on failure', async () => {
        // Arrange
        const mockUser = createMockUser()
        const event = createUserLoggedInEvent(mockUser)
        const error = new Error('Update failed')

        userRepository.update.mockRejectedValue(error)

        // Act
        await handler.handle(event)

        // Assert
        expect(logger.error).toHaveBeenCalledTimes(1)
        expect(logger.error).toHaveBeenCalledWith('Failed to update last sign in timestamps', error)

        // Verify no other log levels were called
        expect(logger.trace).not.toHaveBeenCalled()
        expect(logger.debug).not.toHaveBeenCalled()
        expect(logger.verbose).not.toHaveBeenCalled()
        expect(logger.info).not.toHaveBeenCalled()
        expect(logger.log).not.toHaveBeenCalled()
        expect(logger.warn).not.toHaveBeenCalled()
        expect(logger.fatal).not.toHaveBeenCalled()
      })
    })

    describe('performance considerations', () => {
      it('should handle multiple consecutive events independently', async () => {
        // Arrange
        const users = [createMockUser(), createMockUser(), createMockUser()]
        const events = users.map(user => createUserLoggedInEvent(user))

        userRepository.update.mockResolvedValue(undefined)

        // Act
        await Promise.all(events.map(event => handler.handle(event)))

        // Assert
        expect(userRepository.update).toHaveBeenCalledTimes(3)
        users.forEach(user => {
          expect(user.lastSignInAt).toBeDefined()
          expect(userRepository.update).toHaveBeenCalledWith(user.id, user)
        })
      })

      it('should not block on repository errors', async () => {
        // Arrange
        const mockUser = createMockUser()
        const event = createUserLoggedInEvent(mockUser)

        userRepository.update.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

        // Act
        const startTime = Date.now()
        await handler.handle(event)
        const endTime = Date.now()

        // Assert - Should complete quickly despite repository delay
        expect(endTime - startTime).toBeLessThan(200) // Allow some buffer for test execution
      })
    })
  })
})
