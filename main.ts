import { createServer, IncomingMessage, ServerResponse } from 'http';

import HttpClient from './lib/httpClient';

const httpClient = new HttpClient();

const PORT = 3000;

const getUserData = async () => {
  const response = await httpClient.get('https://randomuser.me/api');
  console.log(response);
  return response.data.results[0];
};

let i = 1;

const sendUserData = (req: IncomingMessage, res: ServerResponse) => {
  res.writeHead(200, {
    Connection: 'keep-alive',
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
  });

  const timer = setInterval(async () => {
    if (i > 10) {
      clearInterval(timer);
      console.log('10 users has been sent.');
      res.write('id: -1\ndata:\n\n');
      res.end();
      return;
    }

    const data = await getUserData();

    res.write(`event: randomUser\nid: ${i}\nretry: 5000\ndata: ${JSON.stringify(data)}\n\n`);

    console.log('User data has been sent.');

    i++;
  }, 2000);

  req.on('close', () => {
    clearInterval(timer);
    res.end();
    console.log('Client closed the connection.');
  });

  req.on('error', (err) => {
    clearInterval(timer);
    res.end();
    console.log('Error', err.message);
  });
};

const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.url === '/getUsers') {
    sendUserData(req, res);
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, () => {
  console.log('server listened on PORT: ', PORT);
});
