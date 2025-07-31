import { Test, TestingModule } from '@nestjs/testing';
import { TransactionContextServiceImpl } from './transaction-context.service.impl';

describe('TransactionContextServiceImpl', () => {
  let service: TransactionContextServiceImpl<any>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TransactionContextServiceImpl],
    }).compile();

    service = module.get<TransactionContextServiceImpl<any>>(TransactionContextServiceImpl);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getContext', () => {
    it('should return undefined when no context is set', () => {
      const result = service.getContext();
      expect(result).toBeUndefined();
    });

    it('should return the context when running within a context', async () => {
      const testContext = { id: 'test-transaction', userId: 123 };

      await service.run(testContext, async () => {
        const result = service.getContext();
        expect(result).toEqual(testContext);
      });
    });

    it('should return undefined after context execution completes', async () => {
      const testContext = { id: 'test-transaction' };

      await service.run(testContext, async () => {
        // Context is available here
        expect(service.getContext()).toEqual(testContext);
      });

      // Context should not be available outside
      expect(service.getContext()).toBeUndefined();
    });
  });

  describe('run', () => {
    it('should execute callback and return its result', async () => {
      const testContext = { id: 'test-transaction' };
      const expectedResult = 'callback-result';

      const result = await service.run(testContext, async () => {
        return expectedResult;
      });

      expect(result).toBe(expectedResult);
    });

    it('should make context available during callback execution', async () => {
      const testContext = { id: 'test-transaction', data: 'test-data' };
      let contextInsideCallback: any;

      await service.run(testContext, async () => {
        contextInsideCallback = service.getContext();
      });

      expect(contextInsideCallback).toEqual(testContext);
    });

    it('should handle async operations within callback', async () => {
      const testContext = { id: 'async-test' };
      let contextDuringDelay: any;

      await service.run(testContext, async () => {
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 10));
        contextDuringDelay = service.getContext();
      });

      expect(contextDuringDelay).toEqual(testContext);
    });

    it('should handle nested contexts correctly', async () => {
      const outerContext = { id: 'outer-context' };
      const innerContext = { id: 'inner-context' };
      const results: any[] = [];

      await service.run(outerContext, async () => {
        results.push(service.getContext());

        await service.run(innerContext, async () => {
          results.push(service.getContext());
        });

        results.push(service.getContext());
      });

      expect(results).toEqual([
        outerContext,
        innerContext,
        outerContext
      ]);
    });

    it('should propagate errors from callback', async () => {
      const testContext = { id: 'error-test' };
      const errorMessage = 'Test error';

      await expect(
        service.run(testContext, async () => {
          throw new Error(errorMessage);
        })
      ).rejects.toThrow(errorMessage);
    });

    it('should not leak context after error', async () => {
      const testContext = { id: 'error-context' };

      try {
        await service.run(testContext, async () => {
          throw new Error('Test error');
        });
      } catch {
        // Expected error
      }

      expect(service.getContext()).toBeUndefined();
    });

    it('should handle different context types', async () => {
      // Test with string context
      await service.run('string-context', async () => {
        expect(service.getContext()).toBe('string-context');
      });

      // Test with number context
      await service.run(42, async () => {
        expect(service.getContext()).toBe(42);
      });

      // Test with complex object context
      const complexContext = {
        transaction: { id: 'tx-123', timestamp: new Date() },
        user: { id: 456, role: 'admin' },
        metadata: { source: 'api', version: '1.0' }
      };

      await service.run(complexContext, async () => {
        expect(service.getContext()).toEqual(complexContext);
      });
    });

    it('should support concurrent executions with different contexts', async () => {
      const context1 = { id: 'context-1' };
      const context2 = { id: 'context-2' };
      const results: any[] = [];

      const promise1 = service.run(context1, async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
        results.push(service.getContext());
      });

      const promise2 = service.run(context2, async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        results.push(service.getContext());
      });

      await Promise.all([promise1, promise2]);

      expect(results).toHaveLength(2);
      expect(results).toContain(context1);
      expect(results).toContain(context2);
    });
  });

  describe('type safety', () => {
    it('should work with strongly typed contexts', async () => {
      interface TestContext {
        transactionId: string;
        userId: number;
        timestamp: Date;
      }

      const typedService = new TransactionContextServiceImpl<TestContext>();
      const testContext: TestContext = {
        transactionId: 'tx-456',
        userId: 789,
        timestamp: new Date()
      };

      await typedService.run(testContext, async () => {
        const context = typedService.getContext();
        expect(context).toEqual(testContext);

        // TypeScript should provide proper typing
        if (context) {
          expect(typeof context.transactionId).toBe('string');
          expect(typeof context.userId).toBe('number');
          expect(context.timestamp).toBeInstanceOf(Date);
        }
      });
    });
  });
});
