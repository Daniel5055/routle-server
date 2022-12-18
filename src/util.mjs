export const simplifyPlayers = (players) =>
  Object.fromEntries(
    Object.entries(players).map(([id, player]) => {
      delete player.socket;
      return [id, player];
    })
  );
