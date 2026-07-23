// /utils/convertPlayers.js

export function convertPlayers(playersJson, defaultWillingness = 1.0) {
  const players = [];
  const playerRoster = {};
  const playerWillingness = {};
  const playerName = {}

  for (const player of playersJson) {
    const playerId = player.allyCode;
    players.push(playerId);

    playerRoster[playerId] = [];
    playerWillingness[playerId] = defaultWillingness;
    playerName[playerId] = player.name

    for (const unit of player.rosterUnit) {
      const baseId = unit.baseId;

      // Determine tier (prefer relic tier)
      const tier =
        unit.relic?.currentTier != null
          ? unit.relic.currentTier
          : 0

      // Add to roster
      playerRoster[playerId].push({
        id: baseId,
        rarity: unit.currentRarity,
        tier,
      });
    }
  }

  return {
    players,
    playerRoster,
    playerWillingness,
    playerName
  };
}
