export class ConnectorError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly httpStatus?: number;

  constructor(
    code: string,
    message: string,
    options?: { retryable?: boolean; httpStatus?: number },
  ) {
    super(message);
    this.name = "ConnectorError";
    this.code = code;
    this.retryable = options?.retryable ?? false;
    if (options?.httpStatus !== undefined) this.httpStatus = options.httpStatus;
  }
}

export function isConnectorError(error: unknown): error is ConnectorError {
  return error instanceof ConnectorError;
}
