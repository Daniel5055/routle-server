export const simplifyPlayers = (players) =>
  Object.fromEntries(
    Object.entries(players).map(([id, player]) => {
      const { socket, ...coreData } = player;
      return [id, coreData];
    })
  );
