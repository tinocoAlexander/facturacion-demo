import { HttpException, HttpStatus } from '@nestjs/common';

export type ErrorPayload = {
  statusCode: number;
  message: string;
  code: string;
  details?: unknown;
};

export function httpError(
  status: HttpStatus,
  code: string,
  message: string,
  details?: unknown,
): HttpException {
  const payload: ErrorPayload = {
    statusCode: status,
    message,
    code,
    ...(details === undefined ? {} : { details }),
  };

  return new HttpException(payload, status);
}
