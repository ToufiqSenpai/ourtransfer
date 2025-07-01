import { HttpStatus, Inject, Injectable } from "@nestjs/common"
import { ContainerClient } from "@azure/storage-blob"
import {
  FileHeaders,
  FileMetadata,
  FileProperties,
  FileStorage,
} from "../../common/interfaces/storage/file-storage.interface"
import { Readable } from "stream"
import { Logger, LOGGER } from "../../common/interfaces/logger/logger.interface"

@Injectable()
export class AzureBlobStorage implements FileStorage {
  public constructor(
    private readonly containerClient: ContainerClient,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {}

  public initiateMultipartUpload(filePath: string, headers?: FileHeaders, metadata?: FileMetadata): Promise<void> {
    throw new Error("Method not implemented.")
  }

  public uploadFilePart(
    filePath: string,
    partNumber: number,
    fileStream: Readable,
    abortSignal?: AbortSignal,
  ): Promise<void> {
    throw new Error("Method not implemented.")
  }

  public completeMultipartUpload(filePath: string): Promise<boolean> {
    throw new Error("Method not implemented.")
  }

  public abortMultipartUpload(filePath: string): Promise<boolean> {
    throw new Error("Method not implemented.")
  }

  public async uploadFile(
    filePath: string,
    fileStream: Readable,
    headers?: FileHeaders,
    metadata?: FileMetadata,
    abortSignal?: AbortSignal,
  ): Promise<void> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(filePath)

    const options = {
      blobHTTPHeaders: {
        blobContentType: headers?.contentType,
        blobContentEncoding: headers?.contentEncoding,
        blobContentLanguage: headers?.contentLanguage,
        blobCacheControl: headers?.cacheControl,
        blobContentDisposition: headers?.contentDisposition,
      },
      metadata,
      abortSignal,
    }

    this.logger.debug(`Uploading file to Azure Blob Storage at path: ${filePath}`)

    await blockBlobClient.uploadStream(fileStream, undefined, undefined, options)

    this.logger.debug(`File uploaded successfully to Azure Blob Storage at path: ${filePath}`)
  }

  public async getFile(filePath: string): Promise<Readable | null> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(filePath)

    try {
      const downloadResponse = await blockBlobClient.download(0)

      return downloadResponse.readableStreamBody as Readable
    } catch (error) {
      this.logger.error(`Failed to download file from Azure Blob Storage at path: ${filePath}`, error)
      return null
    }
  }

  public async getFileProperties(filePath: string): Promise<FileProperties | null> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(filePath)

    try {
      const properties = await blockBlobClient.getProperties()

      return {
        contentType: properties.contentType,
        contentEncoding: properties.contentEncoding,
        contentLanguage: properties.contentLanguage,
        contentDisposition: properties.contentDisposition,
        createdAt: properties.createdOn,
        lastModifiedAt: properties.lastModified,
        size: properties.contentLength,
        metadata: properties.metadata || {},
      }
    } catch (error) {
      this.logger.error(`Failed to get metadata for file at path: ${filePath}`, error)
      return null
    }
  }

  public async deleteFile(filePath: string): Promise<boolean> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(filePath)
    const res = await blockBlobClient.delete()

    return (res._response.status as HttpStatus) == HttpStatus.NO_CONTENT
  }
}
