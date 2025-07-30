import { PasswordIdentity } from "../entities/password-identity.entity"
import { Repository } from "typeorm"
import { InjectDataSource } from "@nestjs/typeorm"
import { AuthProvider } from "@ourtransfer/common"

export class PasswordIdentityRepository extends Repository<PasswordIdentity> {
  public constructor(@InjectDataSource() private readonly dataSource: Repository<PasswordIdentity>) {
    super(PasswordIdentity, dataSource.manager)
  }

  public async findByEmail(email: string): Promise<PasswordIdentity | null> {
    return this.findOne({
      where: { email, authProvider: AuthProvider.EMAIL_PASSWORD },
      relations: ["user"],
    })
  }
}
