# Dovzhenko

## How to use 

### Create server

```js
const server = new Server();

server.createServer();

server.listen(PORT)
```

### Create route

```js
...
const { app } = server;

app.append(<url>, async (req, res) => {...});
...
```

#### dynamic route
```js
...
const { app } = server;
app.append('/route/:slug', async (req, res) => {...});
...
```

### Subscribe to the channel
```js
...
channel = new Channel(options);

app.append('route', async (req, res) => {
  ...
  await channel.subscribe(req, res, events?: Array<string>);
  ...
});
...
```

### Publish message to the channel
```js
...
app.append('post/route', async (req, res) => {
  ...
  await channel.publish(message, event)
  ...
});
```