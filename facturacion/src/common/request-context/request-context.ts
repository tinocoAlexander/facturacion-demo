import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContextStore {
  requestId: string;
  userId?: number;
}

export const requestContextStorage =
  new AsyncLocalStorage<RequestContextStore>();

export function getRequestContext(): Partial<RequestContextStore> {
  return requestContextStorage.getStore() || {};
}

export function getRequestId(): string {
  return getRequestContext().requestId || 'no-context';
}
