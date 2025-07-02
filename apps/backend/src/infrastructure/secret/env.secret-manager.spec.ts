import { EnvSecretManager } from './env.secret-manager'
import { SecretNotFoundException } from '../../common/exceptions/secret-not-found.exception' // Adjusted path

describe('EnvSecretManager', () => {
  let secretManager: EnvSecretManager
  // eslint-disable-next-line no-undef
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    // Store original process.env
    originalEnv = { ...process.env }
    // Instantiate the secret manager. This will call dotenv.config in its constructor.
    secretManager = new EnvSecretManager()
  })

  afterEach(() => {
    // Restore original process.env to avoid interference between tests
    process.env = originalEnv
  })

  describe('constructor', () => {
    // Test constructor indirectly by checking if process.env is affected as expected
    // This is more of an integration test for the constructor's dotenv loading.
    // For simplicity, we'll rely on specific key tests in `get` and `getOrThrow`.
    // To properly unit test constructor, `dotenv.config` would need to be mocked.
    // For now, we assume dotenv loads variables correctly into process.env.
    it('should initialize and allow retrieval of environment variables', async () => {
      // This test primarily ensures the class can be instantiated.
      // Actual .env loading effects are tested via the get method.
      process.env.CONSTRUCTOR_TEST_KEY = 'constructor_value'
      const value = await secretManager.get('CONSTRUCTOR_TEST_KEY')
      expect(value).toBe('constructor_value')
      delete process.env.CONSTRUCTOR_TEST_KEY
    })
  })

  describe('get', () => {
    it('should return a Promise', () => {
      const result = secretManager.get('ANY_KEY')
      expect(result).toBeInstanceOf(Promise)
    })

    it('should resolve to the value if the key exists in process.env', async () => {
      const testKey = 'TEST_KEY_EXISTS'
      const testValue = 'test_value'
      process.env[testKey] = testValue

      const value = await secretManager.get(testKey)
      expect(value).toBe(testValue)

      delete process.env[testKey] // Clean up
    })

    it('should resolve to null if the key does not exist in process.env', async () => {
      const testKey = 'TEST_KEY_DOES_NOT_EXIST'
      delete process.env[testKey] // Ensure it's not set

      const value = await secretManager.get(testKey)
      expect(value).toBeNull()
    })

    it('should resolve to null for an empty string key if not set', async () => {
      const value = await secretManager.get('')
      expect(value).toBeNull() // Assuming process.env[''] is not typically set or is undefined
    })

    it('should resolve to value for an empty string key if it is somehow set in process.env', async () => {
      process.env[''] = 'empty_key_value'
      const value = await secretManager.get('')
      expect(value).toBe('empty_key_value')
      delete process.env['']
    })
  })

  describe('getOrThrow', () => {
    it('should return the value if the key exists in process.env', async () => {
      const testKey = 'TEST_KEY_EXISTS_FOR_THROW'
      const testValue = 'test_value_for_throw'
      process.env[testKey] = testValue

      const value = await secretManager.getOrThrow(testKey)
      expect(value).toBe(testValue)

      delete process.env[testKey] // Clean up
    })

    it('should throw SecretNotFoundException if the key does not exist in process.env', async () => {
      const testKey = 'TEST_KEY_MISSING_FOR_THROW'
      delete process.env[testKey] // Ensure it's not set

      await expect(secretManager.getOrThrow(testKey)).rejects.toThrow(SecretNotFoundException)
    })

    it('should throw SecretNotFoundException with correct message if the key does not exist', async () => {
      const testKey = 'TEST_KEY_MISSING_MESSAGE'
      delete process.env[testKey]

      try {
        await secretManager.getOrThrow(testKey)
      } catch (error) {
        expect(error).toBeInstanceOf(SecretNotFoundException)
        if (error instanceof SecretNotFoundException) {
          // Type guard for TypeScript
          expect(error.message).toBe(`Secret not found: ${testKey}`)
        }
      }
    })
  })
})
