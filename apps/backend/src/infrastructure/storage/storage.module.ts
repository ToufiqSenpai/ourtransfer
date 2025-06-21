import { BlobServiceClient, ContainerClient } from '@azure/storage-blob'
import { Global, Module } from '@nestjs/common'
import { SecretManager } from '../../common/abstracts/secrets/secret-manager.abstract'
import { FILE_STORAGE } from '../../common/interfaces/storage/file-storage.interface'
import { AzureBlobStorage } from './azure-blob.storage'

@Global()
@Module({
  providers: [
    {
      provide: ContainerClient,
      async useFactory(secretManager: SecretManager) {
        const connectionString = await secretManager.getOrThrow('AZURE_STORAGE_CONNECTION_STRING')
        const containerName = await secretManager.getOrThrow('AZURE_STORAGE_CONTAINER_NAME')
        const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString)
        const containerClient = blobServiceClient.getContainerClient(containerName)

        await containerClient.createIfNotExists()

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return containerClient
      },
      inject: [SecretManager],
    },
    {
      provide: FILE_STORAGE,
      useClass: AzureBlobStorage,
    },
  ],
  exports: [
    {
      provide: FILE_STORAGE,
      useClass: AzureBlobStorage,
    },
  ],
})
export class StorageModule {}
