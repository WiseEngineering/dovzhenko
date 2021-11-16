import axios from 'axios';
import { IncomingMessage, ServerResponse } from 'http';
import Server from './lib/server';

const server = new Server();

server.createServer();

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
      res.write('id: -1\ndata:\n\n');
      res.end();
      return;
    }

    const data = await getUserData();
    console.log(data);

    res.write(`event: randomUser\nid: ${i}\nretry: 5000\ndata: ${JSON.stringify(data)}\n\n`);

    console.log('User data has been sent.');

    i++;
  }, 2000);

  req.on('close', () => {
    clearInterval(timer);
    res.end();
    console.log('Client closed the connection.');
  });
};

const countdown = async (res: ServerResponse, count: number) => {
  res.write('data: ' + count + '\n\n');
  if (count) setTimeout(() => countdown(res, count - 1), 1000);
  else res.end();
};

const message = async (req: IncomingMessage, res: ServerResponse) => {
  await countdown(res, 10);
};

const app = server.app;

app.append('getUsers', getUsers);
app.append('message', message);

server.listen(3300);
