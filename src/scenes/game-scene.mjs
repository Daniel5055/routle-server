import { getRandomCities } from '../random.mjs';
import fs from 'fs/promises';
import { simplifyPlayers } from '../util.mjs';
import { Namespace } from 'socket.io';

/**
 * @typedef {object} GameContext
 * @property {*} data
 * @property {number} gameId
 * @property {(scene: *) => void} newScene
 * @property {Namespace} namespace
 */

export const gamScene = {
  /**
   *
   * @param {GameContext} context
   */
  async load(context) {
    context.data.open = false;

    // Change all players state to loading
    Object.values(context.data.players).forEach(
      (player) => (player.state = 'loading')
    );

    // Inform all players of the new player states
    context.namespace.emit('update', {
      players: simplifyPlayers(context.data.players),
    });

    // Get the data for the chosen map
    const mapDataList = JSON.parse(
      (await fs.readFile('data/mapList.json')).toString()
    );
    const mapData = mapDataList.find(
      (data) => data.webPath === context.data.settings.map
    );
    context.data.expectedPrompt = getRandomCities(mapData);
  },
  /**
   *
   * @param {GameContext} context
   * @param {Socket} socket
   */
  async loadEach(context, socket) {
    // Inform of new scene
    socket.emit('scene', 'game');
  },

  /**
   *
   * @param {GameContext} context
   * @param {Socket} socket
   */
  async ready(context, socket) {
    // Sometimes this duplicates?
    if (context.data.players[socket.id].state === 'ready') {
      return;
    }

    context.data.players[socket.id].state = 'ready';
    context.namespace.emit('update', {
      players: simplifyPlayers(context.data.players),
    });

    // If all are ready
    if (
      Object.values(context.data.players).every(
        (player) => player.state === 'ready'
      )
    ) {
      const [start, end, cities] = await context.data.expectedPrompt;

      const emitToAll = (event, message) => {
        socket.emit(event, message);
        socket.broadcast.emit(event, message);
      };

      // Inform all of prompt
      emitToAll('prompt', { start, end, cities });

      // Begin countdown
      setTimeout(() => emitToAll('countdown', 3), 0);
      setTimeout(() => emitToAll('countdown', 2), 1000);
      setTimeout(() => emitToAll('countdown', 1), 2000);
      setTimeout(() => emitToAll('countdown', 0), 3000);
    }
  },
  city(context, socket, city) {
    socket.broadcast.emit('city', { player: socket.id, city });
  },
  win(context, socket) {
    context.data.players[socket.id].state = 'won';
    context.namespace.emit('update', {
      players: simplifyPlayers(context.data.players),
    });
  },
};
