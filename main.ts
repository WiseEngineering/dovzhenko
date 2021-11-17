import { IncomingMessage, ServerResponse } from 'http';

import Server from './lib/server';
import Channel from './lib/chanel';

const server = new Server();
const channel = new Channel();
const app = server.app;

server.createServer();

const bidEvent = {};

const bidEventSubscribe = async (req: IncomingMessage, res: ServerResponse) => {
  console.log(req.url);
  console.log(222);

  res.end();
};

app.append('some/:some', bidEventSubscribe);
app.append('/some', bidEventSubscribe);

server.listen(3300);

// setInterval(() => channel.publish('hello world', 'hello'), 1000);

// const getUserData = async () => {
//   const response = await axios.get('https://randomuser.me/api');

//   return response.data.results[0];
// };

// const getUsers = async (req: IncomingMessage, res: ServerResponse) => {
//   let i = 1;

//   const timer = setInterval(async () => {
//     if (i > 10) {
//       clearInterval(timer);
//       console.log('10 users has been sent.');
//       channel.unsubscribe({ req, res, events: ['getUsers'] });
//       return;
//     }

//     const data = await getUserData();

//     channel.publish(JSON.stringify(data), 'getUsers');

//     console.log('User data has been sent.');

//     i++;
//   }, 2000);

//   channel.subscribe(req, res, ['getUsers']);

//   req.on('close', () => {
//     clearInterval(timer);
//     channel.unsubscribe({ req, res, events: ['getUsers'] });
//   });
// };

// const helloWorld = (req: IncomingMessage, res: ServerResponse) => {
//   channel.subscribe(req, res, ['hello']);
// };

// const setBidEvents = (req: IncomingMessage, res: ServerResponse): void => {

// }

// app.append('hello', helloWorld);
// app.append('getUsers', getUsers);
