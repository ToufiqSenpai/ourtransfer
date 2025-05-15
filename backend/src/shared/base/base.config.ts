import { z } from 'zod'

export abstract class BaseConfig {
  protected constructor(protected configs: { [key: string]: any }) {
    this.validateConfig()
  }

  protected abstract schema(): z.Schema<any>

  private validateConfig() {
    const schema = this.schema()

    schema.parse(this.configs)
  }
}
