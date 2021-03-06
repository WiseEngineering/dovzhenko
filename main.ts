import Server from './lib/server';
import { IRequest, IResponse, IChannel } from './lib/types';
import getMessageTransport from './lib/messageQueue/messageQueue';
import Channel from './lib/channel';

const server = new Server();
server.createServer();

const { app } = server;
const bidEvent: { [name: string]: IChannel } = {};

const message = getMessageTransport('aws', {
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: 'us-east-1',
  topic: process.env.AWS_TOPIC,
});

app.append('/subscribe', async (req: IRequest, res: IResponse) => {
  const { body } = req;

  if (!body?.endpoint || !body?.protocol) {
    res.write('No required data provided');
    res.end();
  }

  const { endpoint, protocol } = body;

  await message.subscribe({
    topic: process.env.AWS_TOPIC,
    endpoint,
    protocol,
  });

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
    const url = body.SubscribeURL;
    await message.confirmSubscription(url, res);
  }

  if (body?.Type === 'Notification') {
    const { payload, event } = JSON.parse(body?.Message);
    await bidEvent[slug].publish({ payload }, event);
  } else if (!body?.Type) {
    bidEvent[slug].subscribe(req, res);
  }
});

server.listen(3300);
