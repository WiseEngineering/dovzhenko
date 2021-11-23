import axios from 'axios';

import Server from './lib/server';
import { IRequest, IResponse, IChannel } from './lib/types';
import getMessageTransport from './lib/messageQueu/messageTransport';
import Channel from './lib/chanel';

const server = new Server();
server.createServer();

const { app } = server;
const bidEvent: { [name: string]: IChannel } = {};
const message = getMessageTransport('aws', {
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION,
  topic: process.env.AWS_TOPIC,
});

app.append('/subscribe', async (req: IRequest, res: IResponse) => {
  const { body } = req;

  if (!body?.endpoint || !body.protocol) {
    res.write('there are no required data');
    res.end();
  }

  const { endpoint, protocol } = body;

  await message.subscribe({
    topic: process.env.AWS_TOPIC,
    endpoint,
    protocol,
  });

  res.write('subscribed');
  res.end();
});

app.append('/publish', async (req: IRequest, res: IResponse) => {
  const { slug, data, event } = req?.body;

  if (!slug && !data && !event) {
    res.writeHead(400, 'body does not contains required data');
    res.end();
  }

  if (slug in bidEvent) {
    await message.publish(JSON.stringify({ data, slug, event }));
  } else {
    res.writeHead(400, 'unknown event type');
    res.end();
  }

  res.writeHead(200);
  res.end();
});

app.append('/bid/:slug', async (req: IRequest, res: IResponse) => {
  const { slug } = req.params;
  const { body } = req;

  if (!(slug in bidEvent)) {
    bidEvent[slug] = new Channel({ maxStreamDuration: 0, pingInterval: 0 });
  }

  if (body?.Type === 'SubscriptionConfirmation') {
    const promise = new Promise((resolve, reject) => {
      const url = body.SubscribeURL;

      axios.get(url).then((response) => {
        if (response.status === 200) {
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

  if (body?.Type === 'Notification') {
    const { data, event } = JSON.parse(body?.Message);
    await bidEvent[slug].publish({ data }, event);
  }

  if (!body?.Type) {
    bidEvent[slug].subscribe(req, res);
  }
});

server.listen(3300);
