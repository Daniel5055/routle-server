import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { getRandomCities } from './random.mjs';
import { readFile } from 'fs/promises';

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
      io.to(socket.id).emit('state', 'invalid');
    }

    const game = games[gameId];

    socket.join(gameId);
    game.players.push({
      id: socket.id,
      name: `Player ${game.nextPlayerId}`,
      state: 'lobby',
    });

    game.nextPlayerId++;

    io.to(gameId).emit('players', JSON.stringify(game.players));
    io.to(socket.id).emit('settings', JSON.stringify(game.settings));
    io.to(socket.id).emit('state', 'lobby');

    socket.on('state-ack', async (state) => {
      console.log(state, 'acknowledgement');
      switch (state) {
        case 'lobby':
          io.to(socket.id).emit('new-leader', game.players[0].id);
          break;

        // When all players have had their maps revealed then send the cities
        case 'reveal':
          const p = game.players.find((player) => player.id === socket.id);
          if (p.state == 'reveal') {
            // Sometimes reveal is confirmed twice??
            console.warn('Player double reveal confirmed?');
            break;
          }

          p.state = 'reveal';

          // Once all players have revealed map
          if (game.players.every((player) => player.state === 'reveal')) {
            console.log('All players reached reveal state', game.players);

            // This is slower but more elegant
            const [start, end, cities] = await readFile('data/mapList.json')
              .then((res) => JSON.parse(res.toString()))
              .then((data) => data.find((m) => m.webPath === game.settings.map))
              .then((map) => getRandomCities(map));

            io.to(gameId).emit(
              'prompt-cities',
              JSON.stringify({ start, end, cities })
            );

            // Initiate the game state
            io.to(gameId).emit('state', 'game');
          }
          break;
      }
    });

    socket.on('city-entered', (msg) => {
      const city = JSON.parse(msg);
      console.log(city);
      socket.broadcast.emit(
        'city-entered',
        JSON.stringify({ player: socket.id, city })
      );
    });

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

    socket.on('start-game', (msg) => {
      io.to(gameId).emit('state', 'starting');
      // Let the cities load and player get ready and then reveal with city targets
      setTimeout(async () => {
        io.to(gameId).emit('state', 'reveal');
      }, 3000);
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
    data: {
      start: null,
      end: null,
    },
    state: 'start',
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
