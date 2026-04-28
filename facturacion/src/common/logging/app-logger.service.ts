import { Injectable, ConsoleLogger } from '@nestjs/common';
import { getRequestId } from '../request-context/request-context';

@Injectable()
export class AppLogger extends ConsoleLogger {
  log(message: unknown, context?: string) {
    super.log(this.enrichMessage(message), context);
  }

  error(message: unknown, stack?: string, context?: string) {
    super.error(this.enrichMessage(message), stack, context);
  }

  warn(message: unknown, context?: string) {
    super.warn(this.enrichMessage(message), context);
  }

  debug(message: unknown, context?: string) {
    super.debug(this.enrichMessage(message), context);
  }

  verbose(message: unknown, context?: string) {
    super.verbose(this.enrichMessage(message), context);
  }

  private enrichMessage(message: unknown): string {
    const requestId = getRequestId();
    const messageStr =
      typeof message === 'string' ? message : JSON.stringify(message);
    if (requestId === 'no-context') {
      return messageStr;
    }
    return `[reqId=${requestId}] ${messageStr}`;
  }
}
