import {
  Client, IChannel, IChannelOptions, IRequest, Message, IResponse,
} from './types';

export default class Channel implements IChannel {
  public options: IChannelOptions;

  public clients: Set<Client> = new Set();

  public messages: Array<Message> = [];

  private nextID: number;

  private active: boolean;

  private pingTimer: any;

  constructor(options: Partial<IChannelOptions>) {
    this.options = {

      pingInterval: 3000,
      maxStreamDuration: 30000,
      clientRetryInterval: 1000,
      startId: 1,
      historySize: 100,
      rewind: 0,
      ...options,
    };

    this.nextID = this.options.startId;
    this.clients = new Set();
    this.messages = [];
    this.active = true;

    if (this.options.pingInterval) {
      this.pingTimer = setInterval(() => this.publish(), this.options.pingInterval);
    }
  }

  public async publish(data?: any, eventName?: string): Promise<void> {
    if (!this.active) throw new Error('Channel closed');

    let output: string;
    let inputData: any = data;
    let id;

    if (!inputData && !eventName) {
      if (!this.clients.size) return;
      output = 'data: \n\n';
    } else {
      this.nextID += 1;
      id = this.nextID;

      if (typeof inputData === 'object') inputData = JSON.stringify(inputData);

      inputData = inputData
        ? inputData
          .split(/[\r\n]+/)
          .map((str: string) => `data: ${str}`)
          .join('\n')
        : '';

      output = `id: ${id}\n${eventName ? `event: ${eventName}\n` : ''}${
        inputData || 'data: '
      }\n\n`;

      this.messages.push({ id, eventName, output });
    }

    [...this.clients]
      .filter((c) => !eventName || Channel.hasEventMatch(c.events, eventName))
      .forEach((c) => c.res.write(output));

    while (this.messages.length > this.options.historySize) {
      this.messages.shift();
    }
  }

  public async subscribe(
    req: IRequest,
    res: IResponse,
    events?: Array<string>,
  ): Promise<Client> {
    if (!this.active) throw new Error('Channel closed');

    const client: Client = { req, res, events };

    client.req.socket.setNoDelay(true);
    client.res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': this.options.maxStreamDuration
        ? `s-maxage=${
          Math.floor(this.options.maxStreamDuration / 1000) - 1
        }; max-age=0; stale-while-revalidate=0; stale-if-error=0`
        : 'no-cache',
      Connection: 'keep-alive',
    });

    let body = `retry: ${this.options.clientRetryInterval}\n\n`;

    const lastEventId = req.headers['last-event-id']
      ? (req.headers['last-event-id'] as string)
      : '';

    const lastID = Number.parseInt(lastEventId, 10);
    const rewind = !Number.isNaN(lastID) ? this.nextID - 1 - lastID : this.options.rewind;

    if (rewind) {
      this.messages
        .filter((m) => Channel.hasEventMatch(client.events, m.eventName))
        .slice(0 - rewind)
        .forEach((m) => {
          body += m.output;
        });
    }

    client.res.write(body);
    this.clients.add(client);

    if (this.options.maxStreamDuration) {
      setTimeout(() => {
        if (!client.res.writableEnded) {
          this.unsubscribe(client);
        }
      }, this.options.maxStreamDuration);
    }

    client.res.on('close', () => this.unsubscribe(client));
    return client;
  }

  public async close(): Promise<void> {
    Promise.all([...this.clients].map(async (c) => c.res.end()));
    this.clients = new Set();
    this.messages = [];
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.active = false;
  }

  public listClients(): { [name: string]: number } {
    const rollupByIP: { [name: string]: number } = {};
    this.clients.forEach((c) => {
      const ip = c.req.socket.remoteAddress!;
      if (!(ip in rollupByIP)) {
        rollupByIP[ip] = 0;
      }
      rollupByIP[ip] += 1;
    });
    return rollupByIP;
  }

  public getSubscriberCount(): number {
    return this.clients.size;
  }

  private async unsubscribe(c: Client): Promise<void> {
    await c.res.end();
    this.clients.delete(c);
  }

  private static hasEventMatch(
    subscriptionList: Array<any> | undefined,
    eventName: string | undefined,
  ): boolean {
    if (!subscriptionList) return true;

    if (!eventName && subscriptionList?.length) return true;

    return (
      subscriptionList.some(
        (pat) => (pat instanceof RegExp ? pat.test(eventName!) : pat === eventName),
      )
    );
  }
}
