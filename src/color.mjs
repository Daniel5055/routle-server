export const colorScheme = [
  '#ebdbb2',
  '#8ec07c',
  '#d3869b',
  '#83a598',
  '#fabd2f',
  '#b8bb26',
  '#fb4934',
  '#fe8019',
];

export function nextFreeColor(players, playerId) {
  const usedColors = Object.entries(players)
    .filter(([id, player]) => id !== playerId)
    .map(([id, player]) => player.color);
  const freeColors = colorScheme.filter((color) => {
    const i = usedColors.findIndex((used) => used === color);

    // If not found, ignore
    if (i < 0) {
      return true;
    }

    // Remove used color otherwise
    usedColors.splice(i, 1);
    return false;
  });

  if (playerId === null) {
    return freeColors[0] ?? colorScheme[0];
  }

  const current = freeColors.findIndex(
    (color) => players[playerId].color === color
  );
  return freeColors[(current + 1) % freeColors.length] ?? colorScheme[0];
}
