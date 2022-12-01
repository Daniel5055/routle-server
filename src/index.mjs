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

    if (!(gameId in games)) {
      io.to(socket.id).emit('not-found', '');
    }

    const game = games[gameId];

    socket.join(gameId);
    game.players.push({ id: socket.id, name: `Player ${game.nextPlayerId}` });

    if (game.nextPlayerId === 1) {
      io.to(gameId).emit('new-leader', socket.id);
    }

    game.nextPlayerId++;

    io.to(gameId).emit('players', JSON.stringify(game.players));
    io.to(gameId).emit('settings', JSON.stringify(game.settings));
    console.log('new player joined', socket.id);

    socket.on('change-name', (name) => {
      game.players.find((player) => player.id === socket.id).name = name;
      io.to(gameId).emit('players', JSON.stringify(game.players));
    });

    socket.on('change-settings', (msg) => {
      const parsedSettings = JSON.parse(msg);
      game.settings = parsedSettings;
      io.to(gameId).emit('settings', JSON.stringify(game.settings));
    });

    socket.on('disconnecting', () => {
      if (!(gameId in games)) {
        return;
      }
      const index = game.players.findIndex((player) => player.id === socket.id);
      if (index === -1) {
        return;
      }

      game.players.splice(index, 1);

      console.log(game.players);
      if (game.players.length === 0) {
        delete game[gameId];
        return;
      }

      io.to(gameId).emit('players', JSON.stringify(game.players));

      if (index === 0) {
        console.log(games, gameId);
        io.to(gameId).emit('new-leader', game.players[0].id);
      }

      console.log('Player left', socket.id);
    });
  });

  console.log('connected', socket.id);
});

app.post('/host-game', (req, res) => {
  games[nextGameId] = {
    players: [],
    nextPlayerId: 1,
    settings: {
      map: 'europe',
      difficulty: 'normal',
    },
  };

  const out = {
    id: nextGameId,
  };

  nextGameId++;

  res.send(JSON.stringify(out));
});

server.listen(port, () => {
  console.log('Listening on port', port);
});
