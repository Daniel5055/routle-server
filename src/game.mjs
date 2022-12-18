import { Socket } from 'socket.io';
import { lobbyScene } from './scenes/lobby-scene.mjs';

const nextGameId = 1;

const defaultSettings = {
  map: 'europe',
  difficulty: 'normal',
};

class Game {
  #nextPlayerId = 1;

  #data = {
    players: {},
    settings: defaultSettings,
    start: null,
    end: null,
  };

  #scene;

  #id;

  constructor() {
    this.#id = nextGameId++;
    this.#scene = lobbyScene;
  }

  /**
   *
   * @param {Socket} playerSocket
   */
  addPlayer(playerSocket) {
    const player = {
      socket: playerSocket,
      name: `Player ${this.#nextPlayerId++}`,
    };

    this.#data.players[playerSocket.id] = player;

    // Load the necessary listeners for the new socket
    this.#loadPlayerScene(player);
  }

  getPlayer(id) {
    return this.#data.players[id];
  }

  loadScene(scene) {
    // Unload old scene from players
    Object.values(this.#data.players).forEach((player) =>
      this.#unloadPlayerScene(player)
    );

    this.#scene = scene;

    // Load new scene for players
    Object.values(this.#data.players).forEach((player) =>
      this.#loadPlayerScene(player)
    );
  }

  #loadPlayerScene(player) {
    const context = {
      data: this.#data,
      gameId: this.#id,
    };

    Object.entries(this.#scene).forEach(([event, handler]) =>
      player.socket.on(event, handler.bind(null, context, player.socket))
    );
  }

  #unloadPlayerScene(player) {
    Object.keys(this.#scene).forEach((event) => player.socket.off(event));
  }
}

export const createGame = () => new Game();
