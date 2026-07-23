import { getRequiredTier } from "./getRequiredTier.js";

/**
 * Computes delta per unit:
 *   delta = numHave - numNeeded
 *
 * numNeeded = number of platoon slots requiring that unit
 * numHave   = number of unique guild members who meet tier/rarity/combatType
 *
 * Returns an array of:
 *   { defId, delta, numNeeded, numHave }
 */
export function computeUnitDeltaArray(originalPayload, playerRoster, unitCombatType) {
  const numNeeded = {};   // unitId → number of required slots
  const eligiblePlayersByUnit = {}; // unitId → Set of playerIds

  // ------------------------------------------------------------
  // Count how many times each unit is required across all zones
  // ------------------------------------------------------------
  for (const zone of originalPayload.zones) {
    for (const slotList of Object.values(zone.operations)) {
      for (const slot of slotList) {
        const unitId = slot.defId;
        numNeeded[unitId] = (numNeeded[unitId] || 0) + 1;
      }
    }
  }

  // ------------------------------------------------------------
  // Count unique eligible players per unit
  // ------------------------------------------------------------
  for (const zone of originalPayload.zones) {
    const zoneId = zone.id;
    const requiredTier = getRequiredTier(zoneId);

    for (const slotList of Object.values(zone.operations)) {
      for (const slot of slotList) {
        const unitId = slot.defId;

        if (!eligiblePlayersByUnit[unitId]) {
          eligiblePlayersByUnit[unitId] = new Set();
        }

        for (const [playerId, roster] of Object.entries(playerRoster)) {
          const unit = roster.find(u => u.id === unitId);
          if (!unit) continue;

          // Rarity requirement
          if (unit.rarity < 7) continue;

          // Combat type requirement
          const combatType = unitCombatType[unitId];
          if (combatType !== 1 && combatType !== 2) continue;

          // Tier requirement (only applies to toons)
          if (combatType === 1 && unit.tier < requiredTier) continue;

          // Player is eligible for this unit in this zone
          eligiblePlayersByUnit[unitId].add(playerId);
        }
      }
    }
  }

  // ------------------------------------------------------------
  // Build final array
  // ------------------------------------------------------------
  const result = [];

  for (const unitId of Object.keys(numNeeded)) {
    const needed = numNeeded[unitId];
    const have = eligiblePlayersByUnit[unitId]?.size || 0;

    result.push({
      defId: unitId,
      delta: have - needed,
      numNeeded: needed,
      numHave: have
    });
  }

  return result;
}
