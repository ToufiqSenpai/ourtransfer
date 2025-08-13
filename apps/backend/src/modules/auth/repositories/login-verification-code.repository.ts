import { InjectDataSource } from "@nestjs/typeorm";
import { BaseRepository } from "../../../infrastructure/database/base.repository";
import { LoginVerificationCode } from "../entities/login-verification-code.entity";
import { DataSource, EntityManager } from "typeorm";
import { TransactionContextService } from "../../../infrastructure/database/unit-of-work/transaction-context.service";

export class LoginVerificationCodeRepository extends BaseRepository<LoginVerificationCode, string> {
  public constructor(
    @InjectDataSource() dataSource: DataSource,
    transactionContextService: TransactionContextService<EntityManager>
  ) {
    super(dataSource, transactionContextService, LoginVerificationCode);
  }

  public async findByUserId(userId: string): Promise<LoginVerificationCode[]> {
    return this.getRepository().find({
      where: {
        user: { id: userId },
      },
    });
  }
}
