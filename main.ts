import axios from 'axios';
import { IncomingMessage, ServerResponse } from 'http';

import Server from './lib/server';
import Channel from './lib/chanel';

const server = new Server();
const channel = new Channel();

server.createServer();

const app = server.app;

setInterval(() => channel.publish('hello world', 'hello'), 1000);

const getUserData = async () => {
  const response = await axios.get('https://randomuser.me/api');

  return response.data.results[0];
};

const getUsers = async (req: IncomingMessage, res: ServerResponse) => {
  let i = 1;

  const timer = setInterval(async () => {
    if (i > 10) {
      clearInterval(timer);
      console.log('10 users has been sent.');
      channel.unsubscribe({ req, res, events: ['getUsers'] });
      return;
    }

    const data = await getUserData();

    channel.publish(JSON.stringify(data), 'getUsers');

    console.log('User data has been sent.');

    i++;
  }, 2000);

  channel.subscribe(req, res, ['getUsers']);

  req.on('close', () => {
    clearInterval(timer);
    channel.unsubscribe({ req, res, events: ['getUsers'] });
  });
};

const helloWorld = (req: IncomingMessage, res: ServerResponse) => {
  channel.subscribe(req, res, ['hello']);
};

app.append('hello', helloWorld);
app.append('getUsers', getUsers);

server.listen(3300);
