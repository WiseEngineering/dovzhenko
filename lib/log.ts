import { IncomingMessage } from 'http';

const log = (req: IncomingMessage, requestStart: number, message?: string): void => {
  const { rawHeaders, httpVersion, method, socket, url } = req;
  const { remoteAddress, remoteFamily } = socket;
  console.log(
    JSON.stringify({
      timestamp: Date.now(),
      processingTime: Date.now() - requestStart,
      rawHeaders,
      httpVersion,
      method,
      remoteAddress,
      remoteFamily,
      url,
    })
  );
  console.log('message: ', message);
};

export default log;
