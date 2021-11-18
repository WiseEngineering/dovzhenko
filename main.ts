import { ServerResponse } from 'http';

import Server, { IRequest } from './lib/server';
import Channel from './lib/chanel';

const server = new Server();
const app = server.app;

server.createServer();

const bidEvent: { [name: string]: any } = {};

app.append('/publish', async (req: IRequest, res: ServerResponse) => {
  const body = req.body;

  if (!body.slug && !body.message && !body.event) {
    res.writeHead(400, 'body does not contains required data');
    res.end();
  }

  const { slug, message, event } = body;

  if (slug in bidEvent) {
    bidEvent[slug].publish(message, event);
    console.log(bidEvent[slug]);
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
    bidEvent[bid] = new Channel({ maxStreamDuration: 15000, pingInterval: 0 });
  }

  await bidEvent[bid].subscribe(req, res);
});

app.append('/status', async (req, res) => {
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

server.listen(3300);
