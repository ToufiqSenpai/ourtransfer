import { Global, Module } from "@nestjs/common"
import { SecretManager } from "./secret-manager.abstract"
import { EnvSecretManager } from "./env.secret-manager"

@Global()
@Module({
  providers: [
    {
      provide: SecretManager,
      useClass: EnvSecretManager,
    },
  ],
  exports: [SecretManager],
})
export class SecretModule {}
