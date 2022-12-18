import { Socket } from 'socket.io';
import { simplifyPlayers } from '../util.mjs';

/**
 * @typedef {object} GameContext
 * @property {*} data
 */

export const lobbyScene = {
  /**
   *
   * @param {GameContext} context
   * @param {string} msg
   */
  update(context, socket, msg) {
    const changes = JSON.parse(msg);

    const { data } = context;

    // These are what are allowed to be changed
    const aspects = {
      player: {
        allowed: ['name'],
        update(data, changes, field) {
          data.players[socket.id][field] = changes.player[field];
        },
        result() {
          return simplifyPlayers(data.players);
        },
      },
      settings: {
        allowed: ['map', 'difficulty'],
        update(data, changes, field) {
          data.players[socket.id][field] = changes.player[field];
        },
        result() {
          return data.settings;
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
          info.allowed.reduce((updated, field) => {
            if (field in changes[aspect]) {
              info.update(data, changes, field);
              return true;
            }
            return updated;
          })
            ? [aspect, info.result()]
            : undefined;
        }
      })
      .filter((result) => result !== undefined)
      .reduce(
        (response, [aspect, result]) => ({ ...response, [aspect]: result }),
        {}
      );

    if (Object.keys(response).length > 0) {
      socket.broadcast.emit('update', JSON.stringify(response));
    }
  },
};
