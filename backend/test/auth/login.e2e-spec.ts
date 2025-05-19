import { App } from 'supertest/types'
import { INestApplication } from '@nestjs/common'
import { Main } from '../../src/main'
import * as request from 'supertest'

describe('POST /api/v1/auth/login', () => {
  let app: INestApplication<App>

  beforeAll(async () => {
    app = await Main.getAppInstance<App>()
  })
})
