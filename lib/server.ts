import { createServer, IncomingMessage, ServerResponse, Server as HttpServer } from 'http';

export type CbFunctionType = (req: IncomingMessage, res: ServerResponse) => void;
export type Middleware<T = (req: IncomingMessage, res: ServerResponse, next: any) => void> = (
  req: IncomingMessage,
  res: ServerResponse,
  next: T
) => void;

class Server {
  private server!: HttpServer;
  private routes!: Array<{ route: string; cb: CbFunctionType }>;
  private middlewares!: Array<Middleware>;

  public createServer(): void {
    this.server = createServer((req: IncomingMessage, res: ServerResponse) => {
      this.setupHandlers(req, res);

      if (!this.routes.find(({ route }) => req.url === route)) {
        res.writeHead(404);
        res.end();
      }

      // route logic
    });
  }

  public listen(port: string): void {
    if (!this.server) {
      throw new Error('you must create server firstly.');
    }

    this.server.listen(port || 3000, () => {
      console.info('server is listened on port: ', port);
    });
  }

  public useRoute(route: string, cb: CbFunctionType): void {
    this.routes.push({ route, cb });
  }

  public use(mdv: Middleware): void {
    this.middlewares.push(mdv);
  }

  private log(
    req: IncomingMessage,
    res: ServerResponse,
    requestStart: number,
    message?: string
  ): void {
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
  }

  private setupHandlers(req: IncomingMessage, res: ServerResponse): void {
    const requestStart = Date.now();

    req.on('error', (err: Error) => {
      this.log(req, res, requestStart, err.message);
    });

    req.on('finish', () => {
      this.log(req, res, requestStart, 'request finished');
    });

    req.on('close', () => {
      this.log(req, res, requestStart, 'client connection is aborded');
    });
  }
}

export default Server;
