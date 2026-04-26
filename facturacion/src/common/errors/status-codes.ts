export function defaultErrorCodeForStatus(statusCode: number): string {
  if (statusCode === 400) return 'BAD_REQUEST';
  if (statusCode === 401) return 'UNAUTHORIZED';
  if (statusCode === 403) return 'FORBIDDEN';
  if (statusCode === 404) return 'NOT_FOUND';
  if (statusCode === 409) return 'CONFLICT';
  if (statusCode === 429) return 'TOO_MANY_REQUESTS';
  if (statusCode === 500) return 'INTERNAL_ERROR';
  return `HTTP_${statusCode}`;
}
