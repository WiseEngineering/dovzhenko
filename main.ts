import { ServerResponse } from 'http';

import Server, { IRequest } from './lib/server';
import Channel, { IChannel } from './lib/chanel';

const server = new Server();
const app = server.app;

server.createServer();

const bidEvent: { [name: string]: IChannel } = {};

app.append('/publish', async (req: IRequest, res: ServerResponse) => {
  const body = req.body;

  if (!body.slug && !body.message && !body.event) {
    res.writeHead(400, 'body does not contains required data');
    res.end();
  }

  const { slug, message, event } = body;

  if (slug in bidEvent) {
    await bidEvent[slug].publish(message, event);
  } else {
    res.writeHead(400, 'unknown event type');
    res.end();
  }

  res.writeHead(200);
  res.end();
});

app.append('/bid/:slug', async (req: IRequest, res: ServerResponse) => {
  const bid = req.params.slug;

  if (!(bid in bidEvent)) {
    bidEvent[bid] = new Channel({ maxStreamDuration: 0, pingInterval: 0 });
  }

  await bidEvent[bid].subscribe(req, res);
});

app.append('/status', async (req: IRequest, res: ServerResponse) => {
  res.write(JSON.stringify(bidEvent));
  res.writeHead(200);
  res.end();
});

app.append('/list/:slug', async (req, res) => {
  const { slug } = req.params;

  if (!slug) {
    res.writeHead(400, 'no slug provided');
    res.end();
  }

  if (slug in bidEvent) {
    res.write(JSON.stringify(bidEvent[slug].listClients()));
  }

  res.end();
});

app.append('unsubscribe/:slug', async (req: IRequest, res: ServerResponse) => {
  const { slug } = req.body;

  if (!slug) {
    res.writeHead(400, 'slug not provided');
    res.end();
  }

  if (slug in bidEvent) {
    res.writeHead(200, 'Client unsubscribed');
    bidEvent[slug].unsubscribe({ req, res });
  } else {
    res.end();
  }
});

app.append('close/:slug', async (req: IRequest, res: ServerResponse) => {
  const { slug } = req.body;

  if (!slug) {
    res.writeHead(400, 'slug not provided');
    res.end();
  }

  if (slug in bidEvent) {
    res.writeHead(200, 'Connection closed');
    bidEvent[slug].close();
  }
  res.end();
});

server.listen(3300);
