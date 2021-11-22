import Server from './lib/server';
import { IRequest, IResponse } from './lib/types';
import getMessageTransport from './lib/messageQueu/messageTransport';

const server = new Server();
const { app } = server;

const message = getMessageTransport('aws', {
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION,
  topic: process.env.AWS_TOPIC,
});

server.createServer();

app.append('/subscribe', async (req: IRequest, res: IResponse) => {
  const { endpoint, protocol } = req?.body;

  await message.subscribe({
    topic: process.env.AWS_TOPIC,
    endpoint,
    protocol,
  });

  res.write('subscribed');
  res.end();
});

app.append('/publish', async (req: IRequest, res: IResponse) => {
  const { data } = req?.body;

  if (!data) {
    res.writeHead(400, 'body does not contains required data');
    res.end();
  }

  await message.publish(JSON.stringify({ data }));

  res.writeHead(200);
  res.end();
});

app.append('/getMessage', async (req: IRequest, res: IResponse) => {
  console.log(req.body);

  res.write(JSON.stringify(req.body));
  res.end();
});

server.listen(3300);
