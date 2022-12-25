import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { createGame } from './game.mjs';

const port = 23177;

// Creation of express and socket.io servers
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

// Endpoint for creating new games
app.post('/host-game', (req, res) => {
  const game = createGame(io);
  res.send(JSON.stringify({ id: game.id }));
});

server.listen(port, () => {
  console.log('Listening on port', port);
});
