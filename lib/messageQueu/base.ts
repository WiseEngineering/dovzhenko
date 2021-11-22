import { AWSInitializationOptions, AWSSubscribe, IMessageTransport } from './types';

abstract class MessageTransport {
  public abstract options: any;

  public abstract factoryMethod(options?: any | AWSInitializationOptions): IMessageTransport;

  public async subscribe(options: any | AWSSubscribe): Promise<any> {
    const transport = this.factoryMethod(this.options);

    await transport.subscribe(options);
  }

  public async publish(message: any, options?: any): Promise<any> {
    const transport = this.factoryMethod(this.options);

    await transport.publishMessage(message, options);
  }
}

export default MessageTransport;
