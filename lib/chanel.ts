import { IncomingMessage, ServerResponse } from 'http';

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
}

export interface IChannel {
  options: IChannelOptions;
  clients: Set<Client>;
  messages: Array<Message>;
  publish: (data: any, eventName: string) => number;
  subscribe: (req: IncomingMessage, res: ServerResponse, events?: Array<string>) => Client;
  unsubscribe: (client: Client) => void;
  close: () => void;
  listClients: () => { [name: string]: any };
  getSubscriberCount: () => number;
}

class Channel implements IChannel {
  public options: IChannelOptions;
  public clients: Set<Client> = new Set();
  public messages: Array<Message> = [];

  private nextID: number;
  private active: boolean;
  private pingTimer: any;

  constructor(options?: Partial<IChannelOptions>) {
    this.options = Object.assign(
      {},
      {
        maxStreamDuration: 100000,
        startId: 1,
        historySize: 100,
        rewind: 1,
      },
      options
    );

    this.nextID = this.options.startId;
    this.active = true;
  }

  public publish(data: any, eventName?: string) {
    if (!this.active) throw new Error('Channel closed');

    let output: string;
    let id: number = this.nextID;
    let inputData = data;

    id = this.nextID++;

    if (typeof data === 'object') inputData = JSON.stringify(data);

    output = `
      id: ${id}
      ${eventName ? 'event: ' + eventName : ''}
      ${inputData ? 'data: ' + inputData : ''}
      `;

    this.messages.push({ id, eventName, output });

    [...this.clients]
      .filter((c) => !eventName || this.hasEventMatch(c.events, eventName))
      .forEach((c) => c.res.write(output));

    while (this.messages.length > this.options.historySize) {
      this.messages.shift();
    }

    return id;
  }

  public subscribe(req: IncomingMessage, res: ServerResponse, events?: Array<string>) {
    if (!this.active) throw new Error('Channel closed');

    const client = { req, res, events };
    client.req.socket.setNoDelay(true);
    client.res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': this.options.maxStreamDuration
        ? 's-maxage=' +
          (Math.floor(this.options.maxStreamDuration / 1000) - 1) +
          '; max-age=0; stale-while-revalidate=0; stale-if-error=0'
        : 'no-cache',
      Connection: 'keep-alive',
    });

    let body = '';

    const lastID = Number.parseInt(req.headers['last-event-id'] as string, 10);

    const rewind = !Number.isNaN(lastID) ? this.nextID - 1 - lastID : this.options.rewind;

    if (rewind) {
      this.messages
        .filter((message) =>
          this.hasEventMatch(client.events?.length ? client.events : [], message.eventName!)
        )
        .slice(0 - rewind)
        .forEach((m) => {
          body += m.output;
        });
    }

    client.res.write(body);

    this.clients.add(client);

    if (this.options.maxStreamDuration) {
      setTimeout(() => {
        if (!client.res.writableFinished) {
          this.unsubscribe(client);
        }
      }, this.options.maxStreamDuration);
    }

    client.res.on('close', () => this.unsubscribe(client));

    return client;
  }

  public unsubscribe(client: Client) {
    client.req.emit('finish');
    client.res.end();
    this.clients.delete(client);
  }

  public close() {
    this.clients.forEach((c) => c.res.end());
    this.clients = new Set();
    this.messages = [];
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.active = false;
  }

  public listClients() {
    const rollupByIP: { [name: string]: any } = {};

    this.clients.forEach((client) => {
      const ip = client.req.socket.remoteAddress!;
      if (!(ip in rollupByIP)) {
        rollupByIP[ip] = 0;
      }
      rollupByIP[ip]++;
    });

    return rollupByIP;
  }

  public getSubscriberCount(): number {
    return this.clients.size;
  }

  private hasEventMatch(subscriptionList: Array<any> | undefined, eventName: string): any {
    return (
      !subscriptionList ||
      subscriptionList.some((sub) =>
        sub instanceof RegExp ? sub.test(eventName) : sub === eventName
      )
    );
  }
}

export default Channel;
