export function getRequiredTier(zoneId) {
  // Bonus zones: "Bonus:1", "Bonus:2", etc.
  if (zoneId.startsWith("Bonus:")) {
    const bonusPhase = zoneId.split(":")[1];
    return bonusPhase === "1" ? 9 : 10;
  }

  // Normal zones: "DS:4", "Mix:4", "LS:2", etc.
  const parts = zoneId.split(":");
  const phase = parseInt(parts[1], 10);

  if (phase === 1) return 7;
  if (phase === 2) return 8;
  if (phase === 3) return 9;
  if (phase === 4) return 10;
  if (phase === 5 || phase === 6) return 11;

  throw new Error(`Unknown zone phase in zoneId: ${zoneId}`);
}