import { Test } from '@nestjs/testing'
import { UserSignedUpEventHandler } from './user-signed-up.handler'
import { UserSignedUpEvent } from '../user-signed-up.event'
import { IDENTITY_REPOSITORY, IdentityRepository } from '../../../auth/repositories/identity.repository'
import { LOGGER, Logger } from '../../../../infrastructure/logger/logger.interface'
import { Identity } from '../../../auth/entities/identity.entity'
import { AuthProvider } from '@ourtransfer/common'
import { mock, MockProxy } from 'jest-mock-extended'
import { faker } from '@faker-js/faker'
import { plainToInstance } from 'class-transformer'
import { User } from '../../../user/entities/user.entity'

describe('UserSignedUpEventHandler', () => {
  let handler: UserSignedUpEventHandler
  let identityRepository: MockProxy<IdentityRepository>
  let logger: MockProxy<Logger>

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserSignedUpEventHandler,
        {
          provide: LOGGER,
          useValue: mock<Logger>(),
        },
        {
          provide: IDENTITY_REPOSITORY,
          useValue: mock<IdentityRepository>(),
        },
      ],
    }).compile()

    handler = module.get(UserSignedUpEventHandler)
    logger = module.get(LOGGER)
    identityRepository = module.get(IDENTITY_REPOSITORY)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('handle', () => {
    const mockUser = plainToInstance(User, {
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      email: faker.internet.email(),
      lastSignInAt: null,
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
    })

    let event: UserSignedUpEvent

    beforeEach(() => {
      event = new UserSignedUpEvent(mockUser)
    })

    afterEach(() => {
      jest.resetAllMocks()
    })

    it('should successfully create email identity when it does not exist', async () => {
      // Arrange
      identityRepository.existsEmailAuthProviderByUserId.mockResolvedValue(false)
      identityRepository.insert.mockResolvedValue(undefined)

      // Act
      await handler.handle(event)

      // Assert
      expect(identityRepository.existsEmailAuthProviderByUserId).toHaveBeenCalledWith(mockUser.id)
      expect(identityRepository.existsEmailAuthProviderByUserId).toHaveBeenCalledTimes(1)

      expect(identityRepository.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          authProvider: AuthProvider.EMAIL,
          user: mockUser,
        })
      )
      expect(identityRepository.insert).toHaveBeenCalledTimes(1)

      expect(logger.warn).not.toHaveBeenCalled()
      expect(logger.error).not.toHaveBeenCalled()
    })

    it('should properly create Identity with correct properties', async () => {
      // Arrange
      identityRepository.existsEmailAuthProviderByUserId.mockResolvedValue(false)
      identityRepository.insert.mockResolvedValue(undefined)

      // Act
      await handler.handle(event)

      // Assert
      const insertedIdentity = identityRepository.insert.mock.calls[0][0]
      expect(insertedIdentity).toBeInstanceOf(Identity)
      expect(insertedIdentity.authProvider).toBe(AuthProvider.EMAIL)
      expect(insertedIdentity.user).toBe(mockUser)
    })

    it('should log warning and return early when email identity already exists', async () => {
      // Arrange
      identityRepository.existsEmailAuthProviderByUserId.mockResolvedValue(true)

      // Act
      await handler.handle(event)

      // Assert
      expect(identityRepository.existsEmailAuthProviderByUserId).toHaveBeenCalledWith(mockUser.id)
      expect(identityRepository.existsEmailAuthProviderByUserId).toHaveBeenCalledTimes(1)

      expect(logger.warn).toHaveBeenCalledWith(`Email identity already exists for user ${mockUser.id}`)
      expect(logger.warn).toHaveBeenCalledTimes(1)

      expect(identityRepository.insert).not.toHaveBeenCalled()
      expect(logger.error).not.toHaveBeenCalled()
    })

    it('should log error and not throw when identity insertion fails', async () => {
      // Arrange
      const insertError = new Error('Database insertion failed')
      identityRepository.existsEmailAuthProviderByUserId.mockResolvedValue(false)
      identityRepository.insert.mockRejectedValue(insertError)

      // Act
      await expect(handler.handle(event)).resolves.toBeUndefined()

      // Assert
      expect(identityRepository.existsEmailAuthProviderByUserId).toHaveBeenCalledWith(mockUser.id)
      expect(identityRepository.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          authProvider: AuthProvider.EMAIL,
          user: mockUser,
        })
      )

      expect(logger.error).toHaveBeenCalledWith(
        `Failed to handle UserSignedUpEvent for user ${mockUser.id}`,
        insertError
      )
      expect(logger.error).toHaveBeenCalledTimes(1)

      expect(logger.warn).not.toHaveBeenCalled()
    })

    it('should handle different user IDs correctly', async () => {
      // Arrange
      const differentUser = plainToInstance(User, {
        id: faker.string.uuid(),
        name: faker.person.fullName(),
        email: faker.internet.email(),
        lastSignInAt: null,
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
      })
      const differentEvent = new UserSignedUpEvent(differentUser)

      identityRepository.existsEmailAuthProviderByUserId.mockResolvedValue(false)
      identityRepository.insert.mockResolvedValue(undefined)

      // Act
      await handler.handle(differentEvent)

      // Assert
      expect(identityRepository.existsEmailAuthProviderByUserId).toHaveBeenCalledWith(differentUser.id)
      expect(identityRepository.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          authProvider: AuthProvider.EMAIL,
          user: differentUser,
        })
      )
    })

    it('should create new Identity instance for each event', async () => {
      // Arrange
      identityRepository.existsEmailAuthProviderByUserId.mockResolvedValue(false)
      identityRepository.insert.mockResolvedValue(undefined)

      // Act - Handle event twice
      await handler.handle(event)
      await handler.handle(event)

      // Assert
      expect(identityRepository.insert).toHaveBeenCalledTimes(2)

      const firstCall = identityRepository.insert.mock.calls[0][0]
      const secondCall = identityRepository.insert.mock.calls[1][0]

      // Should be different instances
      expect(firstCall).not.toBe(secondCall)
      // But should have same properties
      expect(firstCall.authProvider).toBe(AuthProvider.EMAIL)
      expect(firstCall.user).toBe(mockUser)
      expect(secondCall.authProvider).toBe(AuthProvider.EMAIL)
      expect(secondCall.user).toBe(mockUser)
    })

    it('should handle repository check failure gracefully', async () => {
      // Arrange
      const checkError = new Error('Database check failed')
      identityRepository.existsEmailAuthProviderByUserId.mockRejectedValue(checkError)

      // Act & Assert
      await expect(handler.handle(event)).rejects.toThrow('Database check failed')

      expect(identityRepository.existsEmailAuthProviderByUserId).toHaveBeenCalledWith(mockUser.id)
      expect(identityRepository.insert).not.toHaveBeenCalled()
      expect(logger.warn).not.toHaveBeenCalled()
      expect(logger.error).not.toHaveBeenCalled()
    })

    it('should call repository methods in correct order', async () => {
      // Arrange
      const executionOrder: string[] = []

      identityRepository.existsEmailAuthProviderByUserId.mockImplementation(async () => {
        executionOrder.push('existsEmailAuthProviderByUserId')
        return false
      })

      identityRepository.insert.mockImplementation(async () => {
        executionOrder.push('insert')
        return undefined
      })

      // Act
      await handler.handle(event)

      // Assert
      expect(executionOrder).toEqual([
        'existsEmailAuthProviderByUserId',
        'insert'
      ])
    })
  })
})
