import { ZodExceptionFilter } from "./zod-exception.filter"
import { ArgumentsHost } from "@nestjs/common"
import { mock } from "jest-mock-extended"
import { ZodError, ZodIssue } from "zod"

describe("ZodExceptionFilter", () => {
  let filter: ZodExceptionFilter
  let host: ReturnType<typeof mock<ArgumentsHost>>
  let response: {
    status: jest.Mock
    json: jest.Mock
  }

  beforeEach(() => {
    filter = new ZodExceptionFilter()
    response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }
    host = mock<ArgumentsHost>()
    host.switchToHttp.mockReturnValue({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      getResponse: () => response,
    } as any)
  })

  it("should be defined", () => {
    expect(filter).toBeDefined()
  })

  it("should send 400 with specific validation error details", () => {
    const fieldErrors = {
      name: ["Name is required", "Name must be a string"],
      age: ["Age must be a number"],
    }
    // Simulate a ZodError instance with formErrors
    const zodError = mock<ZodError>()
    // @ts-expect-error // Directly setting internal property for testing
    zodError.formErrors = { fieldErrors, formErrors: [] }

    filter.catch(zodError, host)

    expect(response.status).toHaveBeenCalledWith(400)
    expect(response.json).toHaveBeenCalledWith({
      message: "Bad Request.",
      errors: fieldErrors,
    })
  })

  it("should send 400 with empty errors object if fieldErrors is empty", () => {
    const fieldErrors = {}
    const zodError = mock<ZodError>()
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    zodError.formErrors = { fieldErrors, formErrors: [] }

    filter.catch(zodError, host)

    expect(response.status).toHaveBeenCalledWith(400)
    expect(response.json).toHaveBeenCalledWith({
      message: "Bad Request.",
      errors: {},
    })
  })

  it("should send 400 with errors as undefined if fieldErrors is undefined (though ZodError usually provides it)", () => {
    // This case tests how the filter behaves if formErrors.fieldErrors is unexpectedly undefined.
    // ZodError's structure typically ensures formErrors and fieldErrors are present.
    const zodError = mock<ZodError>()
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    zodError.formErrors = { fieldErrors: undefined, formErrors: [] }

    filter.catch(zodError, host)

    expect(response.status).toHaveBeenCalledWith(400)
    expect(response.json).toHaveBeenCalledWith({
      message: "Bad Request.",
      errors: undefined, // Reflecting the direct access in the filter
    })
  })

  it("should correctly handle a ZodError constructed with issues", () => {
    const issues: ZodIssue[] = [
      {
        code: "invalid_type",
        expected: "string",
        received: "number",
        path: ["name"],
        message: "Expected string, received number",
      },
      {
        code: "too_small",
        minimum: 5,
        type: "string",
        inclusive: true,
        path: ["password"],
        message: "String must contain at least 5 character(s)",
      },
    ]
    const zodError = new ZodError(issues)
    // ZodError automatically populates formErrors.fieldErrors from issues

    filter.catch(zodError, host)

    expect(response.status).toHaveBeenCalledWith(400)
    expect(response.json).toHaveBeenCalledWith({
      message: "Bad Request.",
      errors: {
        name: ["Expected string, received number"],
        password: ["String must contain at least 5 character(s)"],
      },
    })
  })
})
