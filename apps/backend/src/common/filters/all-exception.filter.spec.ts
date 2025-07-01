import { ArgumentsHost, HttpException, HttpStatus } from "@nestjs/common"
import { HttpAdapterHost } from "@nestjs/core"
import { AllExceptionFilter } from "./all-exception.filter"
import { mockDeep, DeepMockProxy } from "jest-mock-extended"

describe("AllExceptionFilter", () => {
  let filter: AllExceptionFilter
  let mockHttpAdapterHost: DeepMockProxy<HttpAdapterHost>
  let mockArgumentsHost: DeepMockProxy<ArgumentsHost>
  let mockHttpAdapter: DeepMockProxy<any> // Using any for the adapter methods
  let mockGetResponse: jest.Mock
  let mockGetRequest: jest.Mock
  let mockResponse: DeepMockProxy<any> // Using any for Express Response
  let mockRequest: DeepMockProxy<any> // Using any for Express Request

  beforeEach(() => {
    mockHttpAdapter = mockDeep<any>()
    mockHttpAdapterHost = mockDeep<HttpAdapterHost>()
    mockHttpAdapterHost.httpAdapter = mockHttpAdapter

    mockResponse = mockDeep<any>()
    mockRequest = mockDeep<any>()

    mockGetResponse = jest.fn().mockReturnValue(mockResponse)
    mockGetRequest = jest.fn().mockReturnValue(mockRequest)

    mockArgumentsHost = mockDeep<ArgumentsHost>()
    mockArgumentsHost.switchToHttp.mockReturnValue({
      getResponse: mockGetResponse,
      getRequest: mockGetRequest,
    } as any)

    filter = new AllExceptionFilter(mockHttpAdapterHost)
  })

  afterEach(() => {
    jest.clearAllMocks()
    jest.useRealTimers()
  })

  describe("catch", () => {
    it("should do nothing if headers are already sent", () => {
      mockResponse.headersSent = true
      const exception = new Error("Test error")

      filter.catch(exception, mockArgumentsHost)

      expect(mockHttpAdapter.reply).not.toHaveBeenCalled()
    })

    describe("when exception is HttpException", () => {
      it("should use status and response from HttpException", () => {
        const status = HttpStatus.BAD_REQUEST
        const responsePayload = { message: "Bad request from HttpException", statusCode: status }
        const exception = new HttpException(responsePayload, status)
        mockResponse.headersSent = false

        filter.catch(exception, mockArgumentsHost)

        expect(mockHttpAdapter.reply).toHaveBeenCalledWith(mockResponse, responsePayload, status)
      })

      it("should handle HttpException with string response", () => {
        const status = HttpStatus.NOT_FOUND
        const responsePayloadString = "Resource not found"
        const exception = new HttpException(responsePayloadString, status)
        mockResponse.headersSent = false

        filter.catch(exception, mockArgumentsHost)

        expect(mockHttpAdapter.reply).toHaveBeenCalledWith(mockResponse, responsePayloadString, status)
      })
    })

    describe("when exception is not HttpException (generic Error)", () => {
      const mockTimestamp = "2023-01-01T12:00:00.000Z"
      const mockRequestUrl = "/test/path"

      beforeEach(() => {
        jest.useFakeTimers().setSystemTime(new Date(mockTimestamp))
        mockHttpAdapter.getRequestUrl.mockReturnValue(mockRequestUrl)
        mockResponse.headersSent = false
      })

      it("should set status to 500 and construct a standard error response body", () => {
        const exception = new Error("Generic test error")
        exception.stack = "Error stack trace"

        filter.catch(exception, mockArgumentsHost)

        const expectedResponseBody = {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: exception.message,
          timestamp: mockTimestamp,
          path: mockRequestUrl,
          trace: exception.stack,
        }

        expect(mockHttpAdapter.getRequestUrl).toHaveBeenCalledWith(mockRequest)
        expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
          mockResponse,
          expectedResponseBody,
          HttpStatus.INTERNAL_SERVER_ERROR,
        )
      })

      it("should handle error without a stack trace", () => {
        const exception = new Error("Generic error without stack")
        delete exception.stack // Simulate no stack trace

        filter.catch(exception, mockArgumentsHost)

        const expectedResponseBody = {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: exception.message,
          timestamp: mockTimestamp,
          path: mockRequestUrl,
          trace: undefined, // Stack should be undefined
        }

        expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
          mockResponse,
          expectedResponseBody,
          HttpStatus.INTERNAL_SERVER_ERROR,
        )
      })
    })

    it("should correctly determine httpStatus for non-HttpException initially", () => {
      const exception = new Error("Initial status check")
      exception.stack = "Error: Initial status check at <anonymous>:1:1" // Provide a minimal stack
      mockResponse.headersSent = false

      // Ensure the mock for switchToHttp and getResponse is correctly returning mockResponse for this test
      // This might be redundant if the main beforeEach is always effective, but good for isolation.
      mockArgumentsHost.switchToHttp.mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue(mockRequest), // Ensure getRequest is also available
      } as any)

      mockHttpAdapter.getRequestUrl.mockReturnValue("/some/path") // Needed for the else block

      // Mock the date for consistent timestamp
      const fixedDate = new Date("2023-01-01T00:00:00.000Z")
      jest.useFakeTimers().setSystemTime(fixedDate)

      filter.catch(exception, mockArgumentsHost)

      expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
        mockResponse, // Explicitly check for mockResponse
        expect.objectContaining({
          message: "Initial status check",
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          timestamp: fixedDate.toISOString(),
          path: "/some/path",
          trace: exception.stack,
        }),
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
      jest.useRealTimers() // Clean up fake timers
    })
  })
})
