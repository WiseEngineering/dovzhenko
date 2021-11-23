import AWSTransport from './aws';
import MessageTransport from './base';

import { AWSInitializationOptions, MessageTransports } from '../types';

function getMessageTransport(
  name: MessageTransports,
  options?: any | AWSInitializationOptions,
) :MessageTransport {
  const transport = new AWSTransport();
  transport.factoryMethod(options);

  return transport;
}

export default getMessageTransport;
