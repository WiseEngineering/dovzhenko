/* eslint-disable class-methods-use-this */
// eslint-disable-next-line max-classes-per-file
import { get } from 'https';
import AWS, { SNS } from 'aws-sdk';
import { PublishInput, SubscribeInput } from 'aws-sdk/clients/sns';

import MessageTransport from './base';
import { error } from '../log';
import {
  AWSInitializationOptions, AWSSubscribe, IMessageTransport, IResponse,
} from '../types';

class AWSMessageTransport implements IMessageTransport {
  private client: SNS;

  private options: AWSInitializationOptions;

  constructor({ topic, ...credentials }: AWSInitializationOptions) {
    AWS.config.update(credentials);
    this.options = {
      topic,
      ...credentials,
    };
    this.client = new AWS.SNS();
  }

  public async subscribe({ topic, endpoint, protocol }: AWSSubscribe): Promise<void> {
    const subscribeOptions: SubscribeInput = {
      Endpoint: endpoint,
      TopicArn: topic,
      Protocol: protocol,
    };
    await this.client.subscribe(subscribeOptions).promise().catch((e) => {
      error(e.message);
    });
  }

  public async publishMessage(message: any, topic?: string): Promise<void> {
    const payload: PublishInput = { TopicArn: topic || this.options.topic, Message: message };
    await this.client.publish(payload).promise().catch((e) => {
      error(e.message);
    });
  }

  public async confirm(url: any, res: IResponse): Promise<void> {
    const promise = new Promise((resolve, reject) => {
      get(url, (response) => {
        if (response.statusCode === 200) {
          return resolve('');
        }

        return reject();
      });
    });

    promise.then(() => {
      res.writeHead(200);
      res.end();
    });
  }
}

class AWSTransport extends MessageTransport {
  public options: AWSInitializationOptions = {
    accessKeyId: '',
    secretAccessKey: '',
    region: '',
    topic: '',
  };

  public factoryMethod(options: AWSInitializationOptions): IMessageTransport {
    this.options = options;

    return new AWSMessageTransport(this.options);
  }
}

export default AWSTransport;
