import { Test } from '@nestjs/testing'
import { RedisCache } from './redis.cache'
import { mock, MockProxy } from 'jest-mock-extended'
import Redis from 'ioredis'

describe('RedisCache', () => {
  let cache: RedisCache
  let redis: MockProxy<Redis>

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        RedisCache,
        {
          provide: Redis,
          useValue: mock<Redis>(),
        },
      ],
    }).compile()

    cache = module.get(RedisCache)
    redis = module.get(Redis)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('get', () => {
    it('should return parsed value when key exists', async () => {
      // Arrange
      const key = 'test-key'
      const value = { id: 1, name: 'Test User' }
      const serializedValue = JSON.stringify(value)
      redis.get.mockResolvedValue(serializedValue)

      // Act
      const result = await cache.get<typeof value>(key)

      // Assert
      expect(redis.get).toHaveBeenCalledWith(key)
      expect(result).toEqual(value)
    })

    it('should return null when key does not exist', async () => {
      // Arrange
      const key = 'non-existent-key'
      redis.get.mockResolvedValue(null)

      // Act
      const result = await cache.get(key)

      // Assert
      expect(redis.get).toHaveBeenCalledWith(key)
      expect(result).toBeNull()
    })

    it('should return null when redis returns empty string', async () => {
      // Arrange
      const key = 'empty-key'
      redis.get.mockResolvedValue('')

      // Act
      const result = await cache.get(key)

      // Assert
      expect(redis.get).toHaveBeenCalledWith(key)
      expect(result).toBeNull()
    })

    it('should return null when redis returns undefined', async () => {
      // Arrange
      const key = 'undefined-key'
      redis.get.mockResolvedValue(undefined as any)

      // Act
      const result = await cache.get(key)

      // Assert
      expect(redis.get).toHaveBeenCalledWith(key)
      expect(result).toBeNull()
    })

    it('should parse string values correctly', async () => {
      // Arrange
      const key = 'string-key'
      const value = 'Hello World'
      const serializedValue = JSON.stringify(value)
      redis.get.mockResolvedValue(serializedValue)

      // Act
      const result = await cache.get<string>(key)

      // Assert
      expect(result).toBe(value)
    })

    it('should parse number values correctly', async () => {
      // Arrange
      const key = 'number-key'
      const value = 12345
      const serializedValue = JSON.stringify(value)
      redis.get.mockResolvedValue(serializedValue)

      // Act
      const result = await cache.get<number>(key)

      // Assert
      expect(result).toBe(value)
    })

    it('should parse boolean values correctly', async () => {
      // Arrange
      const key = 'boolean-key'
      const value = true
      const serializedValue = JSON.stringify(value)
      redis.get.mockResolvedValue(serializedValue)

      // Act
      const result = await cache.get<boolean>(key)

      // Assert
      expect(result).toBe(value)
    })

    it('should parse array values correctly', async () => {
      // Arrange
      const key = 'array-key'
      const value = [1, 2, 3, 'test']
      const serializedValue = JSON.stringify(value)
      redis.get.mockResolvedValue(serializedValue)

      // Act
      const result = await cache.get<typeof value>(key)

      // Assert
      expect(result).toEqual(value)
    })

    it('should parse complex object values correctly', async () => {
      // Arrange
      const key = 'complex-key'
      const value = {
        id: 1,
        user: {
          name: 'John Doe',
          email: 'john@example.com',
          active: true
        },
        tags: ['admin', 'user'],
        metadata: null
      }
      const serializedValue = JSON.stringify(value)
      redis.get.mockResolvedValue(serializedValue)

      // Act
      const result = await cache.get<typeof value>(key)

      // Assert
      expect(result).toEqual(value)
    })

    it('should throw error when JSON parsing fails', async () => {
      // Arrange
      const key = 'invalid-json-key'
      const invalidJson = '{ invalid json }'
      redis.get.mockResolvedValue(invalidJson)

      // Act & Assert
      await expect(cache.get(key)).rejects.toThrow()
      expect(redis.get).toHaveBeenCalledWith(key)
    })
  })

  describe('set', () => {
    it('should set value without TTL', async () => {
      // Arrange
      const key = 'test-key'
      const value = { id: 1, name: 'Test User' }
      const expectedSerializedValue = JSON.stringify(value)
      redis.set.mockResolvedValue('OK')

      // Act
      await cache.set(key, value)

      // Assert
      expect(redis.set).toHaveBeenCalledWith(key, expectedSerializedValue)
      expect(redis.set).not.toHaveBeenCalledWith(key, expectedSerializedValue, 'EX', expect.any(Number))
    })

    it('should set value with TTL', async () => {
      // Arrange
      const key = 'test-key'
      const value = { id: 1, name: 'Test User' }
      const ttl = 3600
      const expectedSerializedValue = JSON.stringify(value)
      redis.set.mockResolvedValue('OK')

      // Act
      await cache.set(key, value, ttl)

      // Assert
      expect(redis.set).toHaveBeenCalledWith(key, expectedSerializedValue, 'EX', ttl)
    })

    it('should set string values correctly', async () => {
      // Arrange
      const key = 'string-key'
      const value = 'Hello World'
      const expectedSerializedValue = JSON.stringify(value)
      redis.set.mockResolvedValue('OK')

      // Act
      await cache.set(key, value)

      // Assert
      expect(redis.set).toHaveBeenCalledWith(key, expectedSerializedValue)
    })

    it('should set number values correctly', async () => {
      // Arrange
      const key = 'number-key'
      const value = 12345
      const expectedSerializedValue = JSON.stringify(value)
      redis.set.mockResolvedValue('OK')

      // Act
      await cache.set(key, value)

      // Assert
      expect(redis.set).toHaveBeenCalledWith(key, expectedSerializedValue)
    })

    it('should set boolean values correctly', async () => {
      // Arrange
      const key = 'boolean-key'
      const value = false
      const expectedSerializedValue = JSON.stringify(value)
      redis.set.mockResolvedValue('OK')

      // Act
      await cache.set(key, value)

      // Assert
      expect(redis.set).toHaveBeenCalledWith(key, expectedSerializedValue)
    })

    it('should set null values correctly', async () => {
      // Arrange
      const key = 'null-key'
      const value = null
      const expectedSerializedValue = JSON.stringify(value)
      redis.set.mockResolvedValue('OK')

      // Act
      await cache.set(key, value)

      // Assert
      expect(redis.set).toHaveBeenCalledWith(key, expectedSerializedValue)
    })

    it('should set array values correctly', async () => {
      // Arrange
      const key = 'array-key'
      const value = [1, 'test', true, null]
      const expectedSerializedValue = JSON.stringify(value)
      redis.set.mockResolvedValue('OK')

      // Act
      await cache.set(key, value)

      // Assert
      expect(redis.set).toHaveBeenCalledWith(key, expectedSerializedValue)
    })

    it('should set complex object values correctly', async () => {
      // Arrange
      const key = 'complex-key'
      const value = {
        user: { name: 'John', age: 30 },
        permissions: ['read', 'write'],
        active: true
      }
      const expectedSerializedValue = JSON.stringify(value)
      redis.set.mockResolvedValue('OK')

      // Act
      await cache.set(key, value)

      // Assert
      expect(redis.set).toHaveBeenCalledWith(key, expectedSerializedValue)
    })

    it('should handle TTL of 0 as no TTL', async () => {
      // Arrange
      const key = 'test-key'
      const value = 'test-value'
      const ttl = 0
      const expectedSerializedValue = JSON.stringify(value)
      redis.set.mockResolvedValue('OK')

      // Act
      await cache.set(key, value, ttl)

      // Assert
      expect(redis.set).toHaveBeenCalledWith(key, expectedSerializedValue)
      expect(redis.set).not.toHaveBeenCalledWith(key, expectedSerializedValue, 'EX', ttl)
    })
  })

  describe('delete', () => {
    it('should delete a key', async () => {
      // Arrange
      const key = 'test-key'
      redis.del.mockResolvedValue(1)

      // Act
      await cache.delete(key)

      // Assert
      expect(redis.del).toHaveBeenCalledWith(key)
    })

    it('should handle deletion of non-existent key', async () => {
      // Arrange
      const key = 'non-existent-key'
      redis.del.mockResolvedValue(0)

      // Act
      await cache.delete(key)

      // Assert
      expect(redis.del).toHaveBeenCalledWith(key)
    })
  })

  describe('clear', () => {
    it('should clear all keys when keys exist', async () => {
      // Arrange
      const keys = ['key1', 'key2', 'key3']
      redis.keys.mockResolvedValue(keys)
      redis.del.mockResolvedValue(3)

      // Act
      await cache.clear()

      // Assert
      expect(redis.keys).toHaveBeenCalledWith('*')
      expect(redis.del).toHaveBeenCalledWith(keys)
    })

    it('should not call del when no keys exist', async () => {
      // Arrange
      redis.keys.mockResolvedValue([])

      // Act
      await cache.clear()

      // Assert
      expect(redis.keys).toHaveBeenCalledWith('*')
      expect(redis.del).not.toHaveBeenCalled()
    })

    it('should handle empty keys array', async () => {
      // Arrange
      redis.keys.mockResolvedValue([])

      // Act
      await cache.clear()

      // Assert
      expect(redis.keys).toHaveBeenCalledWith('*')
      expect(redis.del).not.toHaveBeenCalled()
    })

    it('should handle single key', async () => {
      // Arrange
      const keys = ['single-key']
      redis.keys.mockResolvedValue(keys)
      redis.del.mockResolvedValue(1)

      // Act
      await cache.clear()

      // Assert
      expect(redis.keys).toHaveBeenCalledWith('*')
      expect(redis.del).toHaveBeenCalledWith(keys)
    })
  })

  describe('error handling', () => {
    it('should propagate redis errors on get', async () => {
      // Arrange
      const key = 'test-key'
      const error = new Error('Redis connection failed')
      redis.get.mockRejectedValue(error)

      // Act & Assert
      await expect(cache.get(key)).rejects.toThrow(error)
    })

    it('should propagate redis errors on set', async () => {
      // Arrange
      const key = 'test-key'
      const value = 'test-value'
      const error = new Error('Redis connection failed')
      redis.set.mockRejectedValue(error)

      // Act & Assert
      await expect(cache.set(key, value)).rejects.toThrow(error)
    })

    it('should propagate redis errors on delete', async () => {
      // Arrange
      const key = 'test-key'
      const error = new Error('Redis connection failed')
      redis.del.mockRejectedValue(error)

      // Act & Assert
      await expect(cache.delete(key)).rejects.toThrow(error)
    })

    it('should propagate redis errors on clear', async () => {
      // Arrange
      const error = new Error('Redis connection failed')
      redis.keys.mockRejectedValue(error)

      // Act & Assert
      await expect(cache.clear()).rejects.toThrow(error)
    })
  })
})
