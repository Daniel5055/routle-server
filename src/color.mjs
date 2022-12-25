export const colorScheme = [
  '#F94E4E', // red
  '#F8C663', // beige
  '#C3FA85', // pistachio
  '#74FBD0', // teal
  '#77A4F9', // blue
  '#B06FF1', // magenta
  '#F674D6', // pink
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
