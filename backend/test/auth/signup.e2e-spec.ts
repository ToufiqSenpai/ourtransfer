import { Main } from '../../src/main'
import { faker } from '@faker-js/faker'
import { INestApplication } from '@nestjs/common'
import * as request from 'supertest'
import { App } from 'supertest/types'

describe('POST /api/v1/auth/signup', () => {
  let app: INestApplication<App>

  beforeAll(async () => {
    app = await Main.getAppInstance<App>()
  })

  describe('201 Created', () => {
    it('should create a new user and respond with 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          name: faker.person.fullName(),
          email: faker.internet.email(),
          password: faker.internet.password(),
        })
        .expect(201)

      expect(res.body).toEqual({
        message: 'User created successfully.',
      })
    })
  })

  describe('400 Bad Request', () => {
    it('should return 400 if name is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          email: faker.internet.email(),
          password: faker.internet.password(),
        })
        .expect(400)

      expect(res.body.errors.name).toContain('Name is required.')
    })

    it('should return 400 if email is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          name: faker.person.fullName(),
          password: faker.internet.password(),
        })
        .expect(400)

      expect(res.body.errors.email).toContain('Email is required.')
    })

    it('should return 400 if password is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          name: faker.person.fullName(),
          email: faker.internet.email(),
        })
        .expect(400)

      expect(res.body.errors.password).toContain('Password is required.')
    })

    it('should return 400 if email is invalid', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          name: faker.person.fullName(),
          email: 'invalid-email',
          password: faker.internet.password(),
        })
        .expect(400)

      expect(res.body.errors.email).toContain('Email must be a valid email address.')
    })

    it('should return 400 if password is too short', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          name: faker.person.fullName(),
          email: faker.internet.email(),
          password: '123',
        })
        .expect(400)

      expect(res.body.errors.password).toContain('Password must be at least 6 characters long.')
    })

    it('should return 400 if name is too long', async () => {
      const longName = 'a'.repeat(101)
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          name: longName,
          email: faker.internet.email(),
          password: faker.internet.password(),
        })
        .expect(400)

      expect(res.body.errors.name).toContain('Name must be less than 100 characters.')
    })

    it('should return 400 if email is too long', async () => {
      const longEmail = `${'a'.repeat(95)}@e.com`
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          name: faker.person.fullName(),
          email: longEmail,
          password: faker.internet.password(),
        })
        .expect(400)

      expect(res.body.errors.email).toContain('Email must be less than 100 characters.')
    })

    it('should return 400 if password is too long', async () => {
      const longPassword = 'a'.repeat(101)
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          name: faker.person.fullName(),
          email: faker.internet.email(),
          password: longPassword,
        })
        .expect(400)

      expect(res.body.errors.password).toContain('Password must be less than 100 characters.')
    })

    it('should return 400 if email is already in use', async () => {
      const email = faker.internet.email()
      await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          name: faker.person.fullName(),
          email,
          password: faker.internet.password(),
        })
        .expect(201)

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          name: faker.person.fullName(),
          email,
          password: faker.internet.password(),
        })
        .expect(400)

      expect(res.body.errors.email).toContain('Email already in use.')
    })

    it('should return 400 if name is not a string', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          name: 123,
          email: faker.internet.email(),
          password: faker.internet.password(),
        })
        .expect(400)

      expect(res.body.errors.name).toContain('Name must be string.')
    })

    it('should return 400 if email is not a string', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          name: faker.person.fullName(),
          email: 123,
          password: faker.internet.password(),
        })
        .expect(400)

      expect(res.body.errors.email).toContain('Email must be string.')
    })

    it('should return 400 if password is not a string', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          name: faker.person.fullName(),
          email: faker.internet.email(),
          password: 123,
        })
        .expect(400)

      expect(res.body.errors.password).toContain('Password must be string.')
    })
  })
})
