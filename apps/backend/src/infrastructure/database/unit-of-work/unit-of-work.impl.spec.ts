import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, EntityManager, QueryRunner } from 'typeorm';
import { mock, MockProxy } from 'jest-mock-extended';
import { UnitOfWorkImpl } from './unit-of-work.impl';
import { TransactionContextService } from './transaction-context.service';
import { Logger } from '../../log/logger.abstract';

describe('UnitOfWorkImpl', () => {
  let unitOfWork: UnitOfWorkImpl;
  let mockDataSource: MockProxy<DataSource>;
  let mockLogger: MockProxy<Logger>;
  let mockTransactionContext: MockProxy<TransactionContextService<EntityManager>>;
  let mockQueryRunner: MockProxy<QueryRunner>;
  let mockEntityManager: MockProxy<EntityManager>;

  beforeEach(async () => {
    mockDataSource = mock<DataSource>();
    mockLogger = mock<Logger>();
    mockTransactionContext = mock<TransactionContextService<EntityManager>>();
    mockQueryRunner = mock<QueryRunner>();
    mockEntityManager = mock<EntityManager>();

    // Setup default mock behavior
    mockDataSource.createQueryRunner.mockReturnValue(mockQueryRunner);

    // Set the manager property using Object.defineProperty since it's readonly
    Object.defineProperty(mockQueryRunner, 'manager', {
      value: mockEntityManager,
      writable: false,
      configurable: true
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnitOfWorkImpl,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
        {
          provide: TransactionContextService,
          useValue: mockTransactionContext,
        },
      ],
    }).compile();

    unitOfWork = module.get<UnitOfWorkImpl>(UnitOfWorkImpl);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(unitOfWork).toBeDefined();
  });

  describe('transaction', () => {
    it('should successfully execute a transaction and return the callback result', async () => {
      // Arrange
      const expectedResult = 'test-result';
      const callback = jest.fn().mockResolvedValue(expectedResult);

      mockQueryRunner.connect.mockResolvedValue(undefined);
      mockQueryRunner.startTransaction.mockResolvedValue(undefined);
      mockQueryRunner.commitTransaction.mockResolvedValue(undefined);
      mockQueryRunner.release.mockResolvedValue(undefined);
      mockTransactionContext.run.mockImplementation(async (context, cb) => cb());

      // Act
      const result = await unitOfWork.transaction(callback);

      // Assert
      expect(result).toBe(expectedResult);
      expect(mockDataSource.createQueryRunner).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.connect).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.startTransaction).toHaveBeenCalledTimes(1);
      expect(mockTransactionContext.run).toHaveBeenCalledWith(mockEntityManager, callback);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should log transaction start and commit', async () => {
      // Arrange
      const callback = jest.fn().mockResolvedValue('success');

      mockQueryRunner.connect.mockResolvedValue(undefined);
      mockQueryRunner.startTransaction.mockResolvedValue(undefined);
      mockQueryRunner.commitTransaction.mockResolvedValue(undefined);
      mockQueryRunner.release.mockResolvedValue(undefined);
      mockTransactionContext.run.mockImplementation(async (context, cb) => cb());

      // Act
      await unitOfWork.transaction(callback);

      // Assert
      expect(mockLogger.verbose).toHaveBeenCalledWith('Starting transaction');
      expect(mockLogger.verbose).toHaveBeenCalledWith('Transaction committed successfully');
    });

    it('should rollback transaction and log error when callback throws', async () => {
      // Arrange
      const error = new Error('Test error');
      const callback = jest.fn().mockRejectedValue(error);

      mockQueryRunner.connect.mockResolvedValue(undefined);
      mockQueryRunner.startTransaction.mockResolvedValue(undefined);
      mockQueryRunner.rollbackTransaction.mockResolvedValue(undefined);
      mockQueryRunner.release.mockResolvedValue(undefined);
      mockTransactionContext.run.mockImplementation(async (context, cb) => cb());

      // Act & Assert
      await expect(unitOfWork.transaction(callback)).rejects.toThrow(error);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith('Transaction rolled back due to an error', error);
    });

    it('should rollback transaction when startTransaction fails', async () => {
      // Arrange
      const error = new Error('Start transaction failed');
      const callback = jest.fn();

      mockQueryRunner.connect.mockResolvedValue(undefined);
      mockQueryRunner.startTransaction.mockRejectedValue(error);
      mockQueryRunner.rollbackTransaction.mockResolvedValue(undefined);
      mockQueryRunner.release.mockResolvedValue(undefined);

      // Act & Assert
      await expect(unitOfWork.transaction(callback)).rejects.toThrow(error);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(mockTransactionContext.run).not.toHaveBeenCalled();
      expect(callback).not.toHaveBeenCalled();
    });

    it('should rollback transaction when connect fails', async () => {
      // Arrange
      const error = new Error('Connection failed');
      const callback = jest.fn();

      mockQueryRunner.connect.mockRejectedValue(error);
      mockQueryRunner.rollbackTransaction.mockResolvedValue(undefined);
      mockQueryRunner.release.mockResolvedValue(undefined);

      // Act & Assert
      await expect(unitOfWork.transaction(callback)).rejects.toThrow(error);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.startTransaction).not.toHaveBeenCalled();
      expect(mockTransactionContext.run).not.toHaveBeenCalled();
    });

    it('should rollback transaction when commitTransaction fails', async () => {
      // Arrange
      const error = new Error('Commit failed');
      const callback = jest.fn().mockResolvedValue('success');

      mockQueryRunner.connect.mockResolvedValue(undefined);
      mockQueryRunner.startTransaction.mockResolvedValue(undefined);
      mockQueryRunner.commitTransaction.mockRejectedValue(error);
      mockQueryRunner.rollbackTransaction.mockResolvedValue(undefined);
      mockQueryRunner.release.mockResolvedValue(undefined);
      mockTransactionContext.run.mockImplementation(async (context, cb) => cb());

      // Act & Assert
      await expect(unitOfWork.transaction(callback)).rejects.toThrow(error);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith('Transaction rolled back due to an error', error);
    });

    it('should always release the query runner even when rollback fails', async () => {
      // Arrange
      const callbackError = new Error('Callback error');
      const rollbackError = new Error('Rollback error');
      const callback = jest.fn().mockRejectedValue(callbackError);

      mockQueryRunner.connect.mockResolvedValue(undefined);
      mockQueryRunner.startTransaction.mockResolvedValue(undefined);
      mockQueryRunner.rollbackTransaction.mockRejectedValue(rollbackError);
      mockQueryRunner.release.mockResolvedValue(undefined);
      mockTransactionContext.run.mockImplementation(async (context, cb) => cb());

      // Act & Assert
      await expect(unitOfWork.transaction(callback)).rejects.toThrow(rollbackError);

      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
    });

    it('should pass the entity manager to transaction context', async () => {
      // Arrange
      const callback = jest.fn().mockResolvedValue('success');

      mockQueryRunner.connect.mockResolvedValue(undefined);
      mockQueryRunner.startTransaction.mockResolvedValue(undefined);
      mockQueryRunner.commitTransaction.mockResolvedValue(undefined);
      mockQueryRunner.release.mockResolvedValue(undefined);
      mockTransactionContext.run.mockImplementation(async (context, cb) => {
        expect(context).toBe(mockEntityManager);
        return cb();
      });

      // Act
      await unitOfWork.transaction(callback);

      // Assert
      expect(mockTransactionContext.run).toHaveBeenCalledWith(mockEntityManager, callback);
    });

    it('should handle async callbacks correctly', async () => {
      // Arrange
      const expectedResult = { id: 1, name: 'test' };
      const callback = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return expectedResult;
      });

      mockQueryRunner.connect.mockResolvedValue(undefined);
      mockQueryRunner.startTransaction.mockResolvedValue(undefined);
      mockQueryRunner.commitTransaction.mockResolvedValue(undefined);
      mockQueryRunner.release.mockResolvedValue(undefined);
      mockTransactionContext.run.mockImplementation(async (context, cb) => cb());

      // Act
      const result = await unitOfWork.transaction(callback);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should handle transaction context run method throwing error', async () => {
      // Arrange
      const error = new Error('Transaction context error');
      const callback = jest.fn();

      mockQueryRunner.connect.mockResolvedValue(undefined);
      mockQueryRunner.startTransaction.mockResolvedValue(undefined);
      mockQueryRunner.rollbackTransaction.mockResolvedValue(undefined);
      mockQueryRunner.release.mockResolvedValue(undefined);
      mockTransactionContext.run.mockRejectedValue(error);

      // Act & Assert
      await expect(unitOfWork.transaction(callback)).rejects.toThrow(error);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith('Transaction rolled back due to an error', error);
    });

    it('should create a new query runner for each transaction call', async () => {
      // Arrange
      const callback1 = jest.fn().mockResolvedValue('result1');
      const callback2 = jest.fn().mockResolvedValue('result2');

      mockQueryRunner.connect.mockResolvedValue(undefined);
      mockQueryRunner.startTransaction.mockResolvedValue(undefined);
      mockQueryRunner.commitTransaction.mockResolvedValue(undefined);
      mockQueryRunner.release.mockResolvedValue(undefined);
      mockTransactionContext.run.mockImplementation(async (context, cb) => cb());

      // Act
      await unitOfWork.transaction(callback1);
      await unitOfWork.transaction(callback2);

      // Assert
      expect(mockDataSource.createQueryRunner).toHaveBeenCalledTimes(2);
    });

    it('should handle complex return types', async () => {
      // Arrange
      interface ComplexResult {
        users: Array<{ id: number; name: string }>;
        metadata: { count: number; timestamp: Date };
      }

      const expectedResult: ComplexResult = {
        users: [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }],
        metadata: { count: 2, timestamp: new Date() }
      };

      const callback = jest.fn().mockResolvedValue(expectedResult);

      mockQueryRunner.connect.mockResolvedValue(undefined);
      mockQueryRunner.startTransaction.mockResolvedValue(undefined);
      mockQueryRunner.commitTransaction.mockResolvedValue(undefined);
      mockQueryRunner.release.mockResolvedValue(undefined);
      mockTransactionContext.run.mockImplementation(async (context, cb) => cb());

      // Act
      const result = await unitOfWork.transaction(callback);

      // Assert
      expect(result).toEqual(expectedResult);
    });
  });
});
