import { Logger } from '../logger/logger.interface'
import { TypeOrmLogger } from './typeorm.logger'
import { mock, MockProxy } from 'jest-mock-extended'
import { QueryRunner } from 'typeorm'

describe('TypeOrmLogger', () => {
  let typeOrmLogger: TypeOrmLogger
  let mockLogger: MockProxy<Logger>
  let mockQueryRunner: MockProxy<QueryRunner>

  beforeEach(() => {
    mockLogger = mock<Logger>()
    mockQueryRunner = mock<QueryRunner>() // Not used by methods, but good for completeness
    typeOrmLogger = new TypeOrmLogger(mockLogger)
  })

  describe('logQuery', () => {
    it('should call logger.debug with the formatted query and parameters', () => {
      const query = 'SELECT * FROM users WHERE id = ?'
      const parameters = [1]
      typeOrmLogger.logQuery(query, parameters, mockQueryRunner)
      expect(mockLogger.debug).toHaveBeenCalledWith(`Query: ${query} -- Parameters: ${JSON.stringify(parameters)}`)
    })

    it('should call logger.debug with "undefined" for parameters if none are provided', () => {
      const query = 'SELECT * FROM users'
      typeOrmLogger.logQuery(query, undefined, mockQueryRunner)
      expect(mockLogger.debug).toHaveBeenCalledWith(`Query: ${query} -- Parameters: undefined`)
    })

    it('should call logger.debug with empty array string for empty parameters array', () => {
      const query = 'SELECT * FROM users'
      const parameters: any[] = []
      typeOrmLogger.logQuery(query, parameters, mockQueryRunner)
      expect(mockLogger.debug).toHaveBeenCalledWith(`Query: ${query} -- Parameters: ${JSON.stringify(parameters)}`)
    })
  })

  describe('logQueryError', () => {
    it('should call logger.error with the formatted error, query, and parameters when error is a string', () => {
      const error = 'Syntax error'
      const query = 'SELEC * FROM users'
      const parameters = [1]
      typeOrmLogger.logQueryError(error, query, parameters, mockQueryRunner)
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error: ${error} -- Query: ${query} -- Parameters: ${JSON.stringify(parameters)}`,
      )
    })

    it('should call logger.error with the formatted error, query, and parameters when error is an Error object', () => {
      const error = new Error('Unique constraint failed')
      const query = 'INSERT INTO users (email) VALUES (?)'
      const parameters = ['test@example.com']
      typeOrmLogger.logQueryError(error, query, parameters, mockQueryRunner)
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error: ${error.toString()} -- Query: ${query} -- Parameters: ${JSON.stringify(parameters)}`,
      )
    })

    it('should call logger.error with "undefined" for parameters if none are provided', () => {
      const error = 'Connection lost'
      const query = 'SELECT 1'
      typeOrmLogger.logQueryError(error, query, undefined, mockQueryRunner)
      expect(mockLogger.error).toHaveBeenCalledWith(`Error: ${error} -- Query: ${query} -- Parameters: undefined`)
    })
  })

  describe('logQuerySlow', () => {
    it('should call logger.warn with the formatted time, query, and parameters', () => {
      const time = 150
      const query = 'SELECT pg_sleep(0.15)'
      const parameters: any[] = []
      typeOrmLogger.logQuerySlow(time, query, parameters, mockQueryRunner)
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Slow Query (${time}ms): ${query} -- Params: ${JSON.stringify(parameters)}`,
      )
    })

    it('should call logger.warn with "undefined" for parameters if none are provided', () => {
      const time = 200
      const query = 'SELECT pg_sleep(0.2)'
      typeOrmLogger.logQuerySlow(time, query, undefined, mockQueryRunner)
      expect(mockLogger.warn).toHaveBeenCalledWith(`Slow Query (${time}ms): ${query} -- Params: undefined`)
    })
  })

  describe('logSchemaBuild', () => {
    it('should call logger.log with the formatted schema build message', () => {
      const message = 'Schema build started'
      typeOrmLogger.logSchemaBuild(message, mockQueryRunner)
      expect(mockLogger.log).toHaveBeenCalledWith(`Schema Build: ${message}`)
    })
  })

  describe('logMigration', () => {
    it('should call logger.log with the formatted migration message', () => {
      const message = 'Running migration 20231027000000-InitialMigration'
      typeOrmLogger.logMigration(message, mockQueryRunner)
      expect(mockLogger.log).toHaveBeenCalledWith(`Migration: ${message}`)
    })
  })

  describe('log', () => {
    it('should call logger.log when level is "log"', () => {
      const message = 'Generic log message'
      typeOrmLogger.log('log', message, mockQueryRunner)
      expect(mockLogger.log).toHaveBeenCalledWith(message)
      expect(mockLogger.info).not.toHaveBeenCalled()
      expect(mockLogger.warn).not.toHaveBeenCalled()
    })

    it('should call logger.info when level is "info"', () => {
      const message = 'Informational message'
      typeOrmLogger.log('info', message, mockQueryRunner)
      expect(mockLogger.info).toHaveBeenCalledWith(message)
      expect(mockLogger.log).not.toHaveBeenCalled()
      expect(mockLogger.warn).not.toHaveBeenCalled()
    })

    it('should call logger.warn when level is "warn"', () => {
      const message = 'Warning message'
      typeOrmLogger.log('warn', message, mockQueryRunner)
      expect(mockLogger.warn).toHaveBeenCalledWith(message)
      expect(mockLogger.log).not.toHaveBeenCalled()
      expect(mockLogger.info).not.toHaveBeenCalled()
    })

    it('should handle various message types', () => {
      const objectMessage = { detail: 'some detail' }
      typeOrmLogger.log('info', objectMessage, mockQueryRunner)
      expect(mockLogger.info).toHaveBeenCalledWith(objectMessage)

      const numberMessage = 12345
      typeOrmLogger.log('log', numberMessage, mockQueryRunner)
      expect(mockLogger.log).toHaveBeenCalledWith(numberMessage)
    })
  })
})
