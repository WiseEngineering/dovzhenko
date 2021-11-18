import {
  createServer, IncomingMessage, ServerResponse, Server as HttpServer,
} from 'http';
import { parse } from 'url';
import { parse as querystring } from 'querystring';

import App from './app';
import log from './log';
import { IRequest, IServer, Route } from './types';
import { removeArrayElement, splitter } from './utils';

const isEqual = require('lodash.isequal');

class Server implements IServer {
  private server!: HttpServer;

  private routes!: Array<Route>;

  public app = new App();

  public createServer() {
    this.server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      Server.setupHandlers(req);
      this.setupRoutes();
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Request-Method', '*');
      res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
      if (req.headers.origin) {
        res.setHeader('Access-Control-Allow-Headers', req.headers.origin!);
      }
      const route = this.routeParams(Server.parseReqUrl(req.url), req);

      if (!route) {
        res.writeHead(404);
        res.end();
        return;
      }

      req.emit('connection');
      await Server.parseBody(req);
      route?.cb(req as unknown as IRequest, res);
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

  private static async parseBody(req: IncomingMessage): Promise<void> {
    let body: string = '';
    req.on('data', (data: any) => {
      body += data;

      if (body.length > 1e6) {
        req.destroy(new Error('body is too big'));
      }

      Object.assign(req, { body: body ? querystring(body) : {} });
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
      // eslint-disable-next-line consistent-return
      return rout;
    }

    if (!this.routes.find((v) => v.route.match(pattern) && v.route !== req.url)) {
      return;
    }

    const parsedUrl = this.routes.find((v) => {
      const splittedRoute = splitter(v.route);

      if (splittedRoute.length !== url.length) {
        return false;
      }

      const paramIds: Array<number> = [];
      splittedRoute.forEach((val: string, i: number) => {
        if (val.match(pattern)) {
          paramIds.push(i);
        }
      });

      if (!paramIds?.length) {
        return false;
      }

      const routeWithoutParams = removeArrayElement(splittedRoute, paramIds);
      const urlWithoutParams = removeArrayElement(url, paramIds);

      if (!isEqual(routeWithoutParams, urlWithoutParams)) {
        return false;
      }

      return v;
    });

    if (!parsedUrl) {
      return;
    }

    const splittedUrl = splitter(parsedUrl.route);

    Object.assign(req, {
      params: Server.setRequestParams(
        splittedUrl.filter((v, i) => v !== url[i]),
        url.filter((v, i) => v !== splittedUrl[i]),
      ),
    });

    // eslint-disable-next-line consistent-return
    return parsedUrl;
  }

  private static parseReqUrl(reqUrl: string | undefined): Array<string> | undefined {
    if (!reqUrl) return;

    // eslint-disable-next-line consistent-return
    return parse(reqUrl)
      .pathname?.split('/')
      .filter((v) => !!v);
  }

  private static setRequestParams(
    names: Array<string>,
    values: Array<string>,
  ): { [name: string]: string } {
    const obj: { [name: string]: string } = {};

    names.forEach((v, i) => {
      obj[v.replace(':', '')] = values[i];
    });

    return obj;
  }

  private static setupHandlers(req: IncomingMessage): void {
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
