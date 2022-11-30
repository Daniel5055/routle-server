import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

const port = 23177;

let nextGameId = 1;
const games = {};

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Setting the response headers to allow the website to use api
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');

  next();
});

io.on('connection', (socket) => {
  socket.on('join-game', (msg) => {
    const gameId = msg;
    if (gameId in games) {
      socket.join(gameId);
      games[gameId].push(socket.id);

      if (games[gameId].length === 1) {
        io.to(gameId).emit('new-leader', socket.id);
      }
    }
  });
});

app.post('/host-game', (req, res) => {
  games[nextGameId] = [];

  const out = {
    id: nextGameId,
  };

  nextGameId++;

  res.send(JSON.stringify(out));
});

server.listen(port, () => {
  console.log('Listening on port', port);
});
