import {
  createServer, IncomingMessage, ServerResponse, Server as HttpServer,
} from 'http';
import { parse } from 'url';

import App from './app';
import { log } from './log';
import {
  IRequest, IServer, Route, JSONType, FormType, TextType,
} from './types';
import { removeArrayElement, splitter } from './utils';

const json = require('body/json');
const form = require('body/form');
const text = require('body');
const isEqual = require('lodash.isequal');

class Server implements IServer {
  private server!: HttpServer;

  private routes!: Array<Route>;

  public app = new App();

  public createServer() {
    this.server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      Server.setupHandlers(req, res);
      Server.enableCors(req, res);
      this.setupRoutes();

      const route = this.routeParams(Server.parseReqUrl(req.url), req);

      if (!route) {
        res.writeHead(404);
        res.end();
        return;
      }
      req.emit('connection');

      await Server.parseBody(req, res).then(() => {
        route?.cb(req as unknown as IRequest, res);
      });
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

  private static async parseBody(req: IncomingMessage, res: ServerResponse) {
    return new Promise((resolve) => {
      const contentType = req.headers['content-type'];

      const handler = async (e: Error, data: any) => {
        if (e) {
          res.emit('error');
        }

        Object.assign(req, { body: contentType === TextType ? JSON.parse(data) : data || {} });
        resolve(data);
      };

      if (contentType === JSONType) {
        json(req, res, handler);
      } else if (contentType === FormType) {
        form(req, res, handler);
      } else {
        text(req, res, handler);
      }
    });
  }

  private static enableCors(req: IncomingMessage, res: ServerResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Request-Method', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
    if (req.headers.origin) {
      res.setHeader('Access-Control-Allow-Headers', req.headers.origin!);
    }
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

  private static setupHandlers(req: IncomingMessage, res: ServerResponse): void {
    const requestStart = Date.now();

    req.on('error', () => {
      res.writeHead(500, 'error occurs');
      res.end();
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
