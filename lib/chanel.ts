import { IncomingMessage, ServerResponse } from 'http';
import { IRequest } from './server';

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
  publish: (data: any, eventName: string) => number | undefined;
  subscribe: (req: IncomingMessage, res: ServerResponse, events?: Array<string>) => Client;
  unsubscribe: (client: Client) => void;
  close: () => void;
  listClients: () => { [name: string]: any };
  getSubscriberCount: () => number;
}

export default class SSEChannel {
  public options: IChannelOptions;
  public clients: Set<Client> = new Set();
  public messages: Array<Message> = [];

  private nextID: number;
  private active: boolean;
  private pingTimer: any;

  constructor(options: Partial<IChannelOptions>) {
    this.options = Object.assign(
      {},
      {
        pingInterval: 3000,
        maxStreamDuration: 30000,
        clientRetryInterval: 1000,
        startId: 1,
        historySize: 100,
        rewind: 0,
      },
      options
    );

    this.nextID = this.options.startId;
    this.clients = new Set();
    this.messages = [];
    this.active = true;

    if (this.options.pingInterval) {
      this.pingTimer = setInterval(() => this.publish(), this.options.pingInterval);
    }
  }

  public publish(data?: any, eventName?: string) {
    if (!this.active) throw new Error('Channel closed');
    let output;
    let id;
    if (!data && !eventName) {
      if (!this.clients.size) return; // No need to create a ping entry if there are no clients connected
      output = 'data: \n\n';
    } else {
      id = this.nextID++;
      if (typeof data === 'object') data = JSON.stringify(data);
      data = data
        ? data
            .split(/[\r\n]+/)
            .map((str) => 'data: ' + str)
            .join('\n')
        : '';
      output =
        'id: ' +
        id +
        '\n' +
        (eventName ? 'event: ' + eventName + '\n' : '') +
        (data || 'data: ') +
        '\n\n';
      this.messages.push({ id, eventName, output });
    }

    [...this.clients]
      .filter((c) => !eventName || this.hasEventMatch(c.events, eventName))
      .forEach((c) => c.res.write(output));

    while (this.messages.length > this.options.historySize) {
      this.messages.shift();
    }

    return id;
  }

  public async subscribe(
    req: IRequest,
    res: ServerResponse,
    events: Array<string>
  ): Promise<Client> {
    if (!this.active) throw new Error('Channel closed');

    const client: Client = { req, res, events };

    client.req.socket.setNoDelay(true);
    client.res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control':
        's-maxage=' +
        (Math.floor(this.options.maxStreamDuration / 1000) - 1) +
        '; max-age=0; stale-while-revalidate=0; stale-if-error=0',
      Connection: 'keep-alive',
    });

    let body = 'retry: ' + this.options.clientRetryInterval + '\n\n';

    const lastEventId = req.headers['last-event-id']
      ? (req.headers['last-event-id'] as string)
      : '';

    const lastID = Number.parseInt(lastEventId, 10);
    const rewind = !Number.isNaN(lastID) ? this.nextID - 1 - lastID : this.options.rewind;

    if (rewind) {
      this.messages
        .filter((m) => this.hasEventMatch(client.events, m.eventName))
        .slice(0 - rewind)
        .forEach((m) => {
          body += m.output;
        });
    }

    client.res.write(body);
    this.clients.add(client);

    setTimeout(() => {
      if (!client.res.writableEnded) {
        this.unsubscribe(client);
      }
    }, this.options.maxStreamDuration);

    client.res.on('close', () => this.unsubscribe(client));
    return client;
  }

  public async unsubscribe(c): Promise<void> {
    await c.res.end();
    this.clients.delete(c);
  }

  public async close(): Promise<void> {
    Promise.all([...this.clients].map(async (c) => await c.res.end()));
    this.clients = new Set();
    this.messages = [];
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.active = false;
  }

  public listClients(): { [name: string]: number } {
    const rollupByIP: { [name: string]: number } = {};
    this.clients.forEach((c) => {
      const ip = c.req.socket.remoteAddress;
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

  private hasEventMatch(subscriptionList: Array<any>, eventName: string): boolean {
    return (
      !subscriptionList ||
      subscriptionList.some((pat) =>
        pat instanceof RegExp ? pat.test(eventName) : pat === eventName
      )
    );
  }
}

// class Channel implements IChannel {
// public options: IChannelOptions;
// public clients: Set<Client> = new Set();
// public messages: Array<Message> = [];

// private nextID: number;
// private active: boolean;
// private pingTimer: any;

//   constructor(options?: Partial<IChannelOptions>) {
//     this.options = Object.assign(
//       {},
//       {
//         pingInterval: 3000,
//         maxStreamDuration: 30000,
//         clientRetryInterval: 1000,
//         startId: 1,
//         historySize: 100,
//         rewind: 1,
//       },
//       options
//     );

//     this.nextID = this.options.startId;
//     this.active = true;

//     if (this.options.pingInterval) {
//       this.pingTimer = setInterval(() => this.publish(), this.options.pingInterval);
//     }
//   }

//   public publish(data?: any, eventName?: string) {
//     if (!this.active) throw new Error('Channel closed');

//     let output: string;
//     let id: number = this.nextID;
//     let inputData = data;

//     if (!inputData && !eventName) {
//       if (!this.clients.size) return;
//       output = 'data: \n\n';
//     } else {
//       id = this.nextID++;

//       if (typeof data === 'object') inputData = JSON.stringify(data);

//       output = `
//       id: ${id}
//       ${eventName ? 'event: ' + eventName : ''}
//       ${inputData ? 'data: ' + inputData : ''}
//       `;

//       this.messages.push({ id, eventName, output });
//     }

//     [...this.clients]
//       .filter((c) => !eventName || this.hasEventMatch(c.events, eventName))
//       .forEach((c) => c.res.write(output));

//     while (this.messages.length > this.options.historySize) {
//       this.messages.shift();
//     }

//     return id;
//   }

//   public subscribe(req: IncomingMessage, res: ServerResponse, events?: Array<string>) {
//     if (!this.active) throw new Error('Channel closed');

//     const client = { req, res, events };
//     client.req.socket.setNoDelay(true);
//     client.res.writeHead(200, {
//       'Content-Type': 'text/event-stream',
//       'Cache-Control':
//         's-maxage=' +
//         (Math.floor(this.options.maxStreamDuration / 1000) - 1) +
//         '; max-age=0; stale-while-revalidate=0; stale-if-error=0',
//       Connection: 'keep-alive',
//     });

//     let body = 'retry: ' + this.options.clientRetryInterval + '\n\n';
//     console.log(req.headers['last-event-id']);

//     const lastID = Number.parseInt(req.headers['last-event-id'] as string, 10);
//     const rewind = !Number.isNaN(lastID) ? this.nextID - 1 - lastID : this.options.rewind;
//     if (rewind) {
//       this.messages
//         .filter((m) => this.hasEventMatch(client.events, m?.eventName!))
//         .slice(0 - rewind)
//         .forEach((m) => {
//           body += m.output;
//         });
//     }

//     client.res.write(body);
//     this.clients.add(client);

//     if (this.options.maxStreamDuration) {
//       setTimeout(() => {
//         if (!client.res.finished) {
//           this.unsubscribe(client);
//         }
//       }, this.options.maxStreamDuration);
//     }

//     client.res.on('close', () => this.unsubscribe(client));
//     return client;
//   }

//   public unsubscribe(client: Client) {
//     client.req.emit('finish');
//     client.res.end();
//     this.clients.delete(client);
//   }

//   public close() {
//     this.clients.forEach((c) => c.res.end());
//     this.clients = new Set();
//     this.messages = [];
//     if (this.pingTimer) clearInterval(this.pingTimer);
//     this.active = false;
//   }

//   public listClients() {
//     const rollupByIP: { [name: string]: any } = {};

//     this.clients.forEach((client) => {
//       const ip = client.req.socket.remoteAddress!;
//       if (!(ip in rollupByIP)) {
//         rollupByIP[ip] = 0;
//       }
//       rollupByIP[ip]++;
//     });

//     return rollupByIP;
//   }

//   public getSubscriberCount(): number {
//     return this.clients.size;
//   }

//   private hasEventMatch(subscriptionList: Array<any> | undefined, eventName: string): any {
//     return (
//       !subscriptionList ||
//       subscriptionList.some((sub) =>
//         sub instanceof RegExp ? sub.test(eventName) : sub === eventName
//       )
//     );
//   }
// }

// export default Channel;
