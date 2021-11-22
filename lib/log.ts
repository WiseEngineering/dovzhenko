import { IncomingMessage } from 'http';
import { log as consoleLog, error as errorLog } from 'console';

export const log = (req: IncomingMessage, requestStart: number, message?: string): void => {
  const {
    httpVersion, method, socket, url,
  } = req;
  const { remoteAddress, remoteFamily } = socket;
  consoleLog(
    JSON.stringify(
      {
        timestamp: new Date(),
        processingTime: Date.now() - requestStart,
        httpVersion,
        method,
        remoteAddress,
        remoteFamily,
        url,
        message,
      },
      null,
      2,
    ),
  );
};

export const error = (message?: string): void => {
  errorLog(message);
};
