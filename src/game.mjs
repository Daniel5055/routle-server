import { Server, Socket } from 'socket.io';
import { lobbyScene } from './scenes/lobby-scene.mjs';
import { simplifyPlayers } from './util.mjs';

let nextGameId = 1;

const defaultSettings = {
  map: 'europe',
  difficulty: 'normal',
};

const exemptSceneEvents = ['load', 'unload'];

class Game {
  #nextPlayerId = 1;

  #data = {
    players: {},
    settings: defaultSettings,
    open: true,
    expectedPrompt: null,
  };

  #scene;

  id;

  get playerCount() {
    return Object.keys(this.#data.players).length;
  }

  /**
   *
   * @param {Server} socketServer
   */
  constructor(socketServer) {
    this.id = nextGameId++;
    this.#scene = lobbyScene;

    socketServer.of(`/${this.id}`).on('connection', (socket) => {
      console.log(socket.id, 'connected');

      // Players can only join when game is open
      if (!this.#data.open) {
        socket.to(socket.id).emit('closed');
        socket.disconnect();
        console.log(socket.id, 'disconnected (closed server)');
        return;
      }

      this.#addPlayer(socket);
      console.log(socket.id, 'joined successfully');

      socket.on('disconnecting', () => {
        console.log(socket.id, 'disconnected');
        this.#removePlayer(socket);
        if (Object.keys(this.#data.players).length === 0) {
          const nsp = socketServer.of(`/${this.id}`);
          nsp.local.disconnectSockets();
          nsp.removeAllListeners();
          socketServer._nsps.delete(`/${this.id}`);
          console.log(socket.id, 'game closed');
        }
      });
    });
  }

  /**
   *
   * @param {Socket} playerSocket
   */
  #addPlayer(playerSocket) {
    // TODO: Replace isLeader with enum to allow expanding roles
    const player = {
      socket: playerSocket,
      name: `Player ${this.#nextPlayerId++}`,
      isLeader: this.playerCount === 0,
      state: 'idle',
    };

    this.#data.players[playerSocket.id] = player;

    // Load the necessary listeners for the new socket
    this.#loadPlayerScene(player);
  }

  #removePlayer(playerSocket) {
    const player = this.#data.players[playerSocket.id];

    if (!player) {
      return;
    }

    delete this.#data.players[playerSocket.id];

    // TODO: Change players object to map, allows for guaranteed insertion order
    if (player.isLeader && this.playerCount > 0) {
      Object.values(this.#data.players)[0].isLeader = true;
    }

    playerSocket.broadcast.emit('update', {
      players: simplifyPlayers(this.#data.players),
    });
  }

  getPlayer(id) {
    return this.#data.players[id];
  }

  loadScene = (scene) => {
    // Unload old scene from players
    Object.values(this.#data.players).forEach((player) =>
      this.#unloadPlayerScene(player)
    );

    this.#scene = scene;

    // Load new scene for players
    Object.values(this.#data.players).forEach((player) =>
      this.#loadPlayerScene(player)
    );
  };

  #loadPlayerScene(player) {
    const context = {
      data: this.#data,
      gameId: this.id,
      newScene: this.loadScene,
    };

    this.#scene.load?.(context, player.socket);

    Object.entries(this.#scene)
      .filter(([event, _]) => !exemptSceneEvents.includes(event))
      .forEach(([event, handler]) =>
        player.socket.on(event, handler.bind(null, context, player.socket))
      );
  }

  #unloadPlayerScene(player) {
    this.#scene.unload?.(context, player.socket);

    Object.keys(this.#scene)
      .filter((event) => !exemptSceneEvents.includes(event))
      .forEach((event) => player.socket.removeAllListeners(event));
  }
}

export const createGame = (socketServer) => new Game(socketServer);
