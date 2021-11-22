export interface IMessageTransport {
}

abstract class MessageTransportCreator {
  public abstract factoryMethod(): IMessageTransport;
}

export default MessageTransportCreator;
