import { IncomingMessage } from 'http';

const log = (req: IncomingMessage, requestStart: number, message?: string): void => {
  const {
    httpVersion, method, socket, url,
  } = req;
  const { remoteAddress, remoteFamily } = socket;
  console.log(
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

export default log;
