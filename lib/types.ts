import { IncomingMessage, ServerResponse } from 'http';

export type CbFunctionType = (req: IRequest, res: ServerResponse) => void;
export type Route = { route: string; cb: CbFunctionType };
export const JSONType = 'application/json';
export const FormType = 'application/x-www-form-urlencoded';
export const TextType = 'text/plain; charset=UTF-8';

export interface IServer {
  createServer: () => void;
  listen: <T = number>(port?: T) => void;
  app: IApp;
}

export interface IRequest extends IncomingMessage {
  params: { [name: string]: string };
  body: any;
  [name: string]: any
}

export interface IApp {
  routes: Array<Route>;
  append: (event: string, cb: (req: IncomingMessage, res: ServerResponse) => Promise<void>) => void;
}

export type Client = {
  req: IncomingMessage;
  res: ServerResponse;
  events?: Array<string> | undefined;
};

export type Message = {
  id: number;
  eventName: string | undefined;
  output: string;
};

export interface IChannelOptions {
  maxStreamDuration: number;
  startId: number;
  historySize: number;
  rewind: number;
  pingInterval: number;
  clientRetryInterval: number;
}

export interface IChannel {
  options: IChannelOptions;
  clients: Set<Client>;
  messages: Array<Message>;
  publish: (data?: any, eventName?: string) => Promise<number | void>;
  subscribe: (req: IRequest, res: ServerResponse, events?: Array<string>) => Promise<Client>;
  close: () => Promise<void>;
  listClients: () => { [name: string]: any };
  getSubscriberCount: () => number;
}

export interface IResponse extends ServerResponse {
  [name: string]: any
}

export type MessageTransports = 'aws';
export interface IMessageTransport {
  subscribe: (options: any) => Promise<void>
  publishMessage: (message: any, options?: string) => Promise<void>
}

export interface AWSInitializationOptions {
  accessKeyId: string,
  secretAccessKey: string,
  region: string,
  topic: string
}

export interface AWSSubscribe {
  topic: string;
  endpoint: string;
  protocol: 'http' | 'https'
}
