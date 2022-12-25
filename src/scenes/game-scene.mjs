import { getRandomCities } from '../random.mjs';
import fs from 'fs/promises';
import { simplifyPlayers } from '../util.mjs';
import { Namespace } from 'socket.io';
import { lobbyScene } from './lobby-scene.mjs';

/**
 * @typedef {object} GameContext
 * @property {*} data
 * @property {number} gameId
 * @property {(scene: *) => void} newScene
 * @property {Namespace} namespace
 */

export const gameScene = {
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

      // Inform all of prompt
      context.namespace.emit('prompt', { start, end, cities });

      // Begin countdown
      setTimeout(() => context.namespace.emit('countdown', 3), 0);
      setTimeout(() => context.namespace.emit('countdown', 2), 1000);
      setTimeout(() => context.namespace.emit('countdown', 1), 2000);
      setTimeout(() => {
        context.namespace.emit('countdown', 0);
        // Now we start measuring time
        context.data.startTime = Date.now();
      }, 3000);
    }
  },
  city(context, socket, city) {
    socket.broadcast.emit('city', { player: socket.id, city });
  },
  win(context, socket) {
    context.data.players[socket.id].state = 'won';
    context.data.players[socket.id].result =
      Date.now() - context.data.startTime;
    context.namespace.emit('update', {
      players: simplifyPlayers(context.data.players),
    });

    // If the first win
    if (
      Object.values(context.data.players).filter(
        (player) => player.state === 'won'
      ).length === 1
    ) {
      // Countdown for 30 seconds, before ending the game
      setTimeout(() => context.namespace.emit('end'), 30000);
    } else if (
      Object.values(context.data.players).every(
        (player) => player.state === 'won'
      )
    ) {
      context.namespace.emit('end');
    }
  },
  continue(context, socket) {
    // Must ensure was continued by leader
    if (!context.data.players[socket.id].isLeader) {
      return;
    }

    setTimeout(() => context.newScene(lobbyScene), 0);
  }
};
