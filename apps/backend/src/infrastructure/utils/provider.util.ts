import { Injectable } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";

@Injectable()
export class ProviderUtil {
  private static moduleRef: ModuleRef | null = null;

  public constructor(private readonly moduleRef: ModuleRef) {
    ProviderUtil.moduleRef = moduleRef;
  }

  public static get<T>(token: any): T {
    if (!ProviderUtil.moduleRef) {
      throw new Error('ProviderUtil: moduleRef is not initialized. Make sure ProviderUtil is provided in a module and the application has started.');
    }

    try {
      return ProviderUtil.moduleRef.get<T>(token, { strict: false });
    } catch (error) {
      // Add more context to the error
      const tokenName = typeof token === 'symbol' ? token.toString() : token;
      throw new Error(`ProviderUtil: Failed to get provider '${tokenName}'. Original error: ${(error as Error).message}`);
    }
  }
}
