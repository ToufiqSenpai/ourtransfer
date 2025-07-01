export class StreamExceedsLimitException extends Error {
  public constructor(maxSize: number) {
    super(`Stream size exceeds the limit of ${maxSize} bytes.`)
    this.name = "StreamExceedsLimitException"
  }
}
