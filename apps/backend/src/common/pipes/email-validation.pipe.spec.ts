import { BadRequestException } from '@nestjs/common'
import { EmailValidationPipe } from './email-validation.pipe'

describe('EmailValidationPipe', () => {
  let pipe: EmailValidationPipe

  beforeEach(() => {
    pipe = new EmailValidationPipe()
  })

  describe('transform', () => {
    it('should return the email when it is valid', () => {
      // Arrange
      const validEmail = 'test@example.com'

      // Act
      const result = pipe.transform(validEmail)

      // Assert
      expect(result).toBe(validEmail)
    })

    it('should return the email when it has valid complex format', () => {
      // Arrange
      const validComplexEmail = 'test.email+tag@domain.co.uk'

      // Act
      const result = pipe.transform(validComplexEmail)

      // Assert
      expect(result).toBe(validComplexEmail)
    })

    it('should return the email when it has numbers and special characters', () => {
      // Arrange
      const validEmail = 'user123+test@example-domain.org'

      // Act
      const result = pipe.transform(validEmail)

      // Assert
      expect(result).toBe(validEmail)
    })

    it('should throw BadRequestException when email format is invalid', () => {
      // Arrange
      const invalidEmail = 'invalid-email'

      // Act & Assert
      expect(() => pipe.transform(invalidEmail)).toThrow(BadRequestException)
      expect(() => pipe.transform(invalidEmail)).toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            errors: expect.objectContaining({
              email: expect.arrayContaining(['Invalid email format'])
            })
          })
        })
      )
    })

    it('should throw BadRequestException when email is missing @ symbol', () => {
      // Arrange
      const invalidEmail = 'testexample.com'

      // Act & Assert
      expect(() => pipe.transform(invalidEmail)).toThrow(BadRequestException)
      expect(() => pipe.transform(invalidEmail)).toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            errors: expect.objectContaining({
              email: expect.arrayContaining(['Invalid email format'])
            })
          })
        })
      )
    })

    it('should throw BadRequestException when email is missing domain', () => {
      // Arrange
      const invalidEmail = 'test@'

      // Act & Assert
      expect(() => pipe.transform(invalidEmail)).toThrow(BadRequestException)
      expect(() => pipe.transform(invalidEmail)).toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            errors: expect.objectContaining({
              email: expect.arrayContaining(['Invalid email format'])
            })
          })
        })
      )
    })

    it('should throw BadRequestException when email is missing local part', () => {
      // Arrange
      const invalidEmail = '@example.com'

      // Act & Assert
      expect(() => pipe.transform(invalidEmail)).toThrow(BadRequestException)
      expect(() => pipe.transform(invalidEmail)).toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            errors: expect.objectContaining({
              email: expect.arrayContaining(['Invalid email format'])
            })
          })
        })
      )
    })

    it('should throw BadRequestException when email has multiple @ symbols', () => {
      // Arrange
      const invalidEmail = 'test@@example.com'

      // Act & Assert
      expect(() => pipe.transform(invalidEmail)).toThrow(BadRequestException)
      expect(() => pipe.transform(invalidEmail)).toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            errors: expect.objectContaining({
              email: expect.arrayContaining(['Invalid email format'])
            })
          })
        })
      )
    })

    it('should throw BadRequestException when email contains spaces', () => {
      // Arrange
      const invalidEmail = 'test @example.com'

      // Act & Assert
      expect(() => pipe.transform(invalidEmail)).toThrow(BadRequestException)
      expect(() => pipe.transform(invalidEmail)).toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            errors: expect.objectContaining({
              email: expect.arrayContaining(['Invalid email format'])
            })
          })
        })
      )
    })

    it('should throw BadRequestException when email is empty string', () => {
      // Arrange
      const invalidEmail = ''

      // Act & Assert
      expect(() => pipe.transform(invalidEmail)).toThrow(BadRequestException)
      expect(() => pipe.transform(invalidEmail)).toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            errors: expect.objectContaining({
              email: expect.arrayContaining(['Invalid email format'])
            })
          })
        })
      )
    })

    it('should throw BadRequestException when input is null', () => {
      // Arrange
      const invalidInput = null as any

      // Act & Assert
      expect(() => pipe.transform(invalidInput)).toThrow(BadRequestException)
      expect(() => pipe.transform(invalidInput)).toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            errors: expect.objectContaining({
              email: expect.arrayContaining(['Email must be a string'])
            })
          })
        })
      )
    })

    it('should throw BadRequestException when input is undefined', () => {
      // Arrange
      const invalidInput = undefined as any

      // Act & Assert
      expect(() => pipe.transform(invalidInput)).toThrow(BadRequestException)
      expect(() => pipe.transform(invalidInput)).toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            errors: expect.objectContaining({
              email: expect.arrayContaining(['Email is required'])
            })
          })
        })
      )
    })

    it('should throw BadRequestException when input is a number', () => {
      // Arrange
      const invalidInput = 123 as any

      // Act & Assert
      expect(() => pipe.transform(invalidInput)).toThrow(BadRequestException)
      expect(() => pipe.transform(invalidInput)).toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            errors: expect.objectContaining({
              email: expect.arrayContaining(['Email must be a string'])
            })
          })
        })
      )
    })

    it('should throw BadRequestException when input is an object', () => {
      // Arrange
      const invalidInput = { email: 'test@example.com' } as any

      // Act & Assert
      expect(() => pipe.transform(invalidInput)).toThrow(BadRequestException)
      expect(() => pipe.transform(invalidInput)).toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            errors: expect.objectContaining({
              email: expect.arrayContaining(['Email must be a string'])
            })
          })
        })
      )
    })

    it('should throw BadRequestException when input is an array', () => {
      // Arrange
      const invalidInput = ['test@example.com'] as any

      // Act & Assert
      expect(() => pipe.transform(invalidInput)).toThrow(BadRequestException)
      expect(() => pipe.transform(invalidInput)).toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            errors: expect.objectContaining({
              email: expect.arrayContaining(['Email must be a string'])
            })
          })
        })
      )
    })

    it('should preserve original email case', () => {
      // Arrange
      const emailWithMixedCase = 'Test.Email@Example.COM'

      // Act
      const result = pipe.transform(emailWithMixedCase)

      // Assert
      expect(result).toBe(emailWithMixedCase)
      expect(result).not.toBe(emailWithMixedCase.toLowerCase())
    })

    it('should handle international domain names', () => {
      // Arrange
      const internationalEmail = 'test@example.org'

      // Act
      const result = pipe.transform(internationalEmail)

      // Assert
      expect(result).toBe(internationalEmail)
    })

    it('should validate long but valid email addresses', () => {
      // Arrange
      const longEmail = 'this.is.a.very.long.email.address.that.should.still.be.valid@example-domain.com'

      // Act
      const result = pipe.transform(longEmail)

      // Assert
      expect(result).toBe(longEmail)
    })
  })
})
