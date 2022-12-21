import { getRandomCities } from '../random.mjs';
import fs from 'fs/promises';

/**
 * @typedef {object} GameContext
 * @property {*} data
 * @property {number} gameId
 * @property {(scene: *) => void} newScene
 */

export const gamScene = {
  /**
   *
   * @param {GameContext} context
   * @param {Socket} socket
   */
  async load(context, socket) {
    context.data.open = false;

    // Inform of new scene
    socket.emit('scene', 'game');

    // Change all players state to loading
    Object.values(context.data.players).forEach((player) => {
      player.state = 'loading';
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
  async ready(context, socket) {
    // Sometimes this duplicates?
    if (context.data.players[socket.id].state === 'ready') {
      return;
    }

    context.data.players[socket.id].state = 'ready';

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
};
