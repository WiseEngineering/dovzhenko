import { createServer, IncomingMessage, ServerResponse, Server as HttpServer } from 'http';
import { parse } from 'url';

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

      const route = this.routeParams(this.parseReqUrl(req.url), req);

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

  private routeParams(url: Array<string> | undefined, req: IncomingMessage): Route | undefined {
    if (!url) return;

    const pattern = new RegExp(':(.*)');

    const rout = this.routes.find(({ route }) => route === req.url);

    if (rout) {
      Object.assign(req, { params: {} });
      return rout;
    }

    if (!this.routes.find((v) => v.route.match(pattern) && v.route !== req.url)) {
      return;
    }

    const parsedUrl = this.routes.find((v) => this.splitter(v.route).length === url.length);

    if (!parsedUrl) {
      return;
    }

    const splittedUrl = this.splitter(parsedUrl.route);

    Object.assign(req, {
      params: this.setRequestParams(
        splittedUrl.filter((v, i) => v !== url[i]),
        url.filter((v, i) => v !== splittedUrl[i])
      ),
    });

    return parsedUrl;
  }

  private parseReqUrl(reqUrl: string | undefined): Array<string> | undefined {
    if (!reqUrl) return;

    return parse(reqUrl)
      .pathname?.split('/')
      .filter((v) => !!v);
  }

  private splitter(str: string): Array<string> {
    return str.split('/').filter((val) => (val !== undefined ? val : false));
  }

  private setRequestParams(
    names: Array<string>,
    values: Array<string>
  ): { [name: string]: string } {
    const obj: { [name: string]: string } = {};

    names.forEach((v, i) => (obj[v.replace(':', '')] = values[i]));
    return obj;
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
