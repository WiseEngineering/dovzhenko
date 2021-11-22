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
