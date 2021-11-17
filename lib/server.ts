import { createServer, IncomingMessage, ServerResponse, Server as HttpServer } from 'http';

import App, { IApp } from './app';
import log from './log';

export type CbFunctionType = (req: IncomingMessage, res: ServerResponse) => void;
export type Route = { route: string; cb: CbFunctionType };
export interface IServer {
  createServer: () => void;
  listen: <T = number>(port?: T) => void;
  app: IApp;
}

class Server implements IServer {
  private server!: HttpServer;
  private routes!: Array<Route>;

  public app = new App();

  public createServer() {
    this.server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      this.setupHandlers(req, res);
      this.setupRoutes();

      const route = this.routes.find(({ route }) => req.url === route);

      if (!route) {
        res.writeHead(404);
        res.end();
        return;
      }

      req.emit('connection');
      await route?.cb(req, res);
    });
  }

  public listen<T = number>(port?: T): void {
    if (!this.server) {
      throw new Error('you must create server firstly.');
    }

    this.server.listen(port || 3000, () => {
      console.info('server is listened on port: ', port || 3000);
    });
  }

  private setupRoutes(): void {
    this.routes = this.app.routes;
  }

  private setupHandlers(req: IncomingMessage, res: ServerResponse): void {
    const requestStart = Date.now();

    req.on('error', (err: Error) => {
      log(req, requestStart, err.message);
    });
    req.on('finish', () => {
      log(req, requestStart, 'Request finished');
    });
    req.on('connection', () => {
      log(req, requestStart, 'Client connected');
    });
  }
}

export default Server;
