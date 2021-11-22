/* eslint-disable class-methods-use-this */
// eslint-disable-next-line max-classes-per-file
import MessageTransportCreator, { IMessageTransport } from './creator';

class AWSTransport implements IMessageTransport {

}

class AWSTransportCreator extends MessageTransportCreator {
  public factoryMethod(): IMessageTransport {
    return new AWSTransport();
  }
}

export default AWSTransportCreator;
