import { Socket } from 'socket.io';
import { simplifyPlayers } from '../util.mjs';
import { gamScene } from './game-scene.mjs';

/**
 * @typedef {object} GameContext
 * @property {*} data
 * @property {number} gameId
 * @property {(scene: *) => void} newScene
 */

export const lobbyScene = {
  /**
   *
   * @param {GameContext} context
   * @param {Socket} socket
   */
  load(context, socket) {
    const { data } = context;

    context.data.open = true;

    // Inform of new scene
    socket.emit('scene', 'lobby');

    // Inform the other players of a new player, and inform the new player of all the state
    socket.broadcast.emit('update', { players: simplifyPlayers(data.players) });
    socket.emit('update', {
      players: simplifyPlayers(data.players),
      settings: data.settings,
    });
  },

  /**
   *
   * @param {GameContext} context
   * @param {Socket} socket
   * @param {*} changes
   */
  update(context, socket, changes) {
    const { data } = context;

    console.log(changes);

    // These are what are allowed to be changed
    const aspects = {
      player: {
        allowed: ['name'],
        update(data, changes, field) {
          data.players[socket.id][field] = changes.player[field];
        },
        result() {
          return { players: simplifyPlayers(data.players) };
        },
      },
      settings: {
        allowed: ['map', 'difficulty'],
        update(data, changes, field) {
          data.settings[field] = changes.settings[field];
        },
        result() {
          return { settings: data.settings };
        },
      },
    };

    // Appending the changes to player and settings
    // No race conditions expected as:
    // - only single player can edit settings
    // - each player can only edit their own player

    // This code first assigns every allowed updated field to the game state
    // Then if at least one field got updated, include that game state in the update response
    // Which is then broadcasted to the rest of the socket group
    const response = Object.entries(aspects)
      .map(([aspect, info]) => {
        if (aspect in changes) {
          return (
            info.allowed.reduce((updated, field) => {
              if (field in changes[aspect]) {
                info.update(data, changes, field);
                return true;
              }
              return updated;
            }, false) && info.result()
          );
        }
      })
      .filter((result) => result !== undefined)
      .reduce((response, result) => ({ ...response, ...result }), {});

    if (Object.keys(response).length > 0) {
      socket.broadcast.emit('update', response);
      console.log(response);
    }
  },
  /**
   *
   * @param {GameContext} context
   * @param {Socket} socket
   * @param {string} msg
   */
  start(context, socket, msg) {
    // Must ensure was started by leader
    if (!context.data.players[socket.id].isLeader) {
      return;
    }

    // Close game to new players wanting to join
    context.data.open = false;

    socket.broadcast.emit('start');

    setTimeout(() => context.newScene(gamScene));
  },
};
