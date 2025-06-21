import { Readable } from 'stream'

export interface FileHeaders {
  cacheControl?: string
  contentDisposition?: string
  contentEncoding?: string
  contentLanguage?: string
  contentType?: string
}

export type FileMetadata = Record<string, string>

export interface FileProperties {
  contentType?: string
  contentEncoding?: string
  contentLanguage?: string
  contentDisposition?: string
  createdAt?: Date
  lastModifiedAt?: Date
  size?: number
  metadata?: FileMetadata
}

export enum FileOperation {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
}

export const FILE_STORAGE = Symbol('FileStorage')

export interface FileStorage {
  initiateMultipartUpload(filePath: string, headers?: FileHeaders, metadata?: FileMetadata): Promise<void>
  uploadFilePart(filePath: string, partNumber: number, fileStream: Readable, abortSignal?: AbortSignal): Promise<void>
  completeMultipartUpload(filePath: string): Promise<boolean>
  abortMultipartUpload(filePath: string): Promise<boolean>
  uploadFile(
    filePath: string,
    fileStream: Readable,
    headers?: FileHeaders,
    metadata?: FileMetadata,
    abortSignal?: AbortSignal,
  ): Promise<void>
  getFile(filePath: string): Promise<Readable | null>
  getFileProperties(filePath: string): Promise<FileProperties | null>
  getPresignedUrl(filePath: string, expiresInMiliseconds: number, operation: FileOperation): Promise<string>
  deleteFile(filePath: string): Promise<boolean>
}
