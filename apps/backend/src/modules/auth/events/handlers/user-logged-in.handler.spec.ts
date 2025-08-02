import { Test } from '@nestjs/testing'
import { UserLoggedInHandler } from './user-logged-in.handler'
import { UserLoggedInEvent } from '../user-logged-in.event'
import { mock, MockProxy } from 'jest-mock-extended'
import { faker } from '@faker-js/faker'
import { plainToInstance } from 'class-transformer'
import { LOGGER, Logger } from '../../../../infrastructure/logger/logger.interface'
import { UNIT_OF_WORK, UnitOfWork } from '../../../../infrastructure/database/unit-of-work/unit-of-work.interface'
import { IDENTITY_REPOSITORY, IdentityRepository } from '../../repositories/identity.repository'
import { USER_REPOSITORY, UserRepository } from '../../../user/repositories/user.repository'
import { User } from '../../../user/entities/user.entity'
import { PasswordIdentity } from '../../entities/password-identity.entity'
import { AuthProvider } from '@ourtransfer/common'

describe('UserLoggedInHandler', () => {
  let handler: UserLoggedInHandler
  let logger: MockProxy<Logger>
  let unitOfWork: MockProxy<UnitOfWork>
  let identityRepository: MockProxy<IdentityRepository>
  let userRepository: MockProxy<UserRepository>

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserLoggedInHandler,
        {
          provide: LOGGER,
          useValue: mock<Logger>(),
        },
        {
          provide: UNIT_OF_WORK,
          useValue: mock<UnitOfWork>(),
        },
        {
          provide: IDENTITY_REPOSITORY,
          useValue: mock<IdentityRepository>(),
        },
        {
          provide: USER_REPOSITORY,
          useValue: mock<UserRepository>(),
        },
      ],
    }).compile()

    handler = module.get(UserLoggedInHandler)
    logger = module.get(LOGGER)
    unitOfWork = module.get(UNIT_OF_WORK)
    identityRepository = module.get(IDENTITY_REPOSITORY)
    userRepository = module.get(USER_REPOSITORY)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('handle', () => {
    const mockUser = plainToInstance(User, {
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      email: faker.internet.email(),
      lastSignInAt: faker.date.past(),
      identities: [],
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      updateLastSignInAt: jest.fn(),
    })

    const mockIdentity = plainToInstance(PasswordIdentity, {
      id: faker.string.uuid(),
      email: mockUser.email,
      passwordHash: faker.string.alphanumeric(60),
      authProvider: AuthProvider.EMAIL_PASSWORD,
      lastSignInAt: faker.date.past(),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      updateLastSignInAt: jest.fn(),
      user: mockUser,
    })

    let event: UserLoggedInEvent

    beforeEach(() => {
      event = new UserLoggedInEvent(mockUser, mockIdentity)
    })

    afterEach(() => {
      jest.resetAllMocks()
      jest.restoreAllMocks()
    })

    it('should successfully update last sign in timestamps for user and identity', async () => {
      // Arrange
      unitOfWork.transaction.mockImplementation(async (callback) => {
        return await callback()
      })
      userRepository.update.mockResolvedValue(undefined)
      identityRepository.update.mockResolvedValue(undefined)
      // Ensure updateLastSignInAt is a jest mock
      mockUser.updateLastSignInAt = jest.fn()
      mockIdentity.updateLastSignInAt = jest.fn()

      // Act
      await handler.handle(event)

      // Assert
      expect(unitOfWork.transaction).toHaveBeenCalledTimes(1)
      expect(mockUser.updateLastSignInAt).toHaveBeenCalledTimes(1)
      expect(mockIdentity.updateLastSignInAt).toHaveBeenCalledTimes(1)
      expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, mockUser)
      expect(identityRepository.update).toHaveBeenCalledWith(mockIdentity.id, mockIdentity)
      expect(logger.error).not.toHaveBeenCalled()
    })

    it('should call updateLastSignInAt methods before repository updates', async () => {
      // Arrange
      const updateOrder: string[] = []

      mockUser.updateLastSignInAt = jest.fn(() => {
        updateOrder.push('user.updateLastSignInAt')
      })

      mockIdentity.updateLastSignInAt = jest.fn(() => {
        updateOrder.push('identity.updateLastSignInAt')
      })

      userRepository.update.mockImplementation(async () => {
        updateOrder.push('userRepository.update')
      })

      identityRepository.update.mockImplementation(async () => {
        updateOrder.push('identityRepository.update')
      })

      unitOfWork.transaction.mockImplementation(async (callback) => {
        return await callback()
      })

      // Act
      await handler.handle(event)

      // Assert
      expect(updateOrder).toEqual([
        'user.updateLastSignInAt',
        'userRepository.update',
        'identity.updateLastSignInAt',
        'identityRepository.update'
      ])
    })

    it('should log error and continue when user repository update fails', async () => {
      // Arrange
      const repositoryError = new Error('Database connection failed')
      userRepository.update.mockRejectedValue(repositoryError)

      unitOfWork.transaction.mockImplementation(async (callback) => {
        return await callback()
      })

      // Act
      await handler.handle(event)

      // Assert
      expect(mockUser.updateLastSignInAt).toHaveBeenCalledTimes(1)
      expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, mockUser)
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to update last sign in timestamps',
        repositoryError
      )
    })

    it('should log error and continue when identity repository update fails', async () => {
      // Arrange
      const repositoryError = new Error('Identity update failed')
      userRepository.update.mockResolvedValue(undefined)
      identityRepository.update.mockRejectedValue(repositoryError)

      unitOfWork.transaction.mockImplementation(async (callback) => {
        return await callback()
      })

      // Act
      await handler.handle(event)

      // Assert
      expect(mockUser.updateLastSignInAt).toHaveBeenCalledTimes(1)
      expect(mockIdentity.updateLastSignInAt).toHaveBeenCalledTimes(1)
      expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, mockUser)
      expect(identityRepository.update).toHaveBeenCalledWith(mockIdentity.id, mockIdentity)
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to update last sign in timestamps',
        repositoryError
      )
    })

    it('should log error and continue when transaction fails', async () => {
      // Arrange
      const transactionError = new Error('Transaction failed')
      unitOfWork.transaction.mockRejectedValue(transactionError)

      // Act
      await handler.handle(event)

      // Assert
      expect(unitOfWork.transaction).toHaveBeenCalledTimes(1)
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to update last sign in timestamps',
        transactionError
      )
      expect(userRepository.update).not.toHaveBeenCalled()
      expect(identityRepository.update).not.toHaveBeenCalled()
    })

    it('should handle event with different identity types', async () => {
      // Arrange
      const googleIdentity = plainToInstance(PasswordIdentity, {
        id: faker.string.uuid(),
        email: mockUser.email,
        passwordHash: null,
        authProvider: AuthProvider.GOOGLE,
        lastSignInAt: faker.date.past(),
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
        updateLastSignInAt: jest.fn(),
        user: mockUser,
      })

      // Ensure updateLastSignInAt is a jest mock
      mockUser.updateLastSignInAt = jest.fn()
      googleIdentity.updateLastSignInAt = jest.fn()

      const eventWithGoogleIdentity = new UserLoggedInEvent(mockUser, googleIdentity)

      unitOfWork.transaction.mockImplementation(async (callback) => {
        return await callback()
      })
      userRepository.update.mockResolvedValue(undefined)
      identityRepository.update.mockResolvedValue(undefined)

      // Act
      await handler.handle(eventWithGoogleIdentity)

      // Assert
      expect(unitOfWork.transaction).toHaveBeenCalledTimes(1)
      expect(mockUser.updateLastSignInAt).toHaveBeenCalledTimes(1)
      expect(googleIdentity.updateLastSignInAt).toHaveBeenCalledTimes(1)
      expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, mockUser)
      expect(identityRepository.update).toHaveBeenCalledWith(googleIdentity.id, googleIdentity)
      expect(logger.error).not.toHaveBeenCalled()
    })

    it('should not throw error when update methods modify entity state', async () => {
      // Arrange
      const originalLastSignInAt = mockUser.lastSignInAt

      mockUser.updateLastSignInAt = jest.fn(() => {
        mockUser.lastSignInAt = new Date()
      })

      mockIdentity.updateLastSignInAt = jest.fn(() => {
        mockIdentity.lastSignInAt = new Date()
      })

      unitOfWork.transaction.mockImplementation(async (callback) => {
        return await callback()
      })
      userRepository.update.mockResolvedValue(undefined)
      identityRepository.update.mockResolvedValue(undefined)

      // Act
      await handler.handle(event)

      // Assert
      expect(mockUser.lastSignInAt).not.toBe(originalLastSignInAt)
      expect(mockUser.updateLastSignInAt).toHaveBeenCalledTimes(1)
      expect(mockIdentity.updateLastSignInAt).toHaveBeenCalledTimes(1)
      expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, mockUser)
      expect(identityRepository.update).toHaveBeenCalledWith(mockIdentity.id, mockIdentity)
      expect(logger.error).not.toHaveBeenCalled()
    })
  })
})
