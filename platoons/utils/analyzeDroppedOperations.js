import { getRequiredTier } from "./getRequiredTier.js";

/**
 * Analyze solver output to determine:
 * 1. Which platoon slots were left unfilled
 * 2. Which specific toons caused the dropped operation
 *
 * @param {Object} originalPayload - zones → operations → slots
 * @param {Object} solverOutput - placementsByZone from solver
 * @param {Object} playerRoster - roster per player
 * @param {Object} unitCombatType - toon/ship classification
 * @returns {string} filepath to results JSON
 */
export function analyzeDroppedOperations(
  originalPayload,
  solverOutput,
  playerRoster,
  unitCombatType,
) {
  const missing = {};

  const placements = solverOutput.placementsByZone || {};

  for (const zone of originalPayload.zones) {
    const zoneId = zone.id;
    const solverZone = placements[zoneId] || {};
    missing[zoneId] = {};

    for (const [opId, slotList] of Object.entries(zone.operations)) {
      const expectedSlotKeys = slotList.map((s) => s.key);
      const filledSlotKeys = (solverZone[opId] || []).map((p) => p.unit.key);

      const missingKeys = expectedSlotKeys.filter(
        (key) => !filledSlotKeys.includes(key),
      );

      if (missingKeys.length === 0) continue;

      missing[zoneId][opId] = [];

      for (const slot of slotList) {
        if (!missingKeys.includes(slot.key)) continue;

        const unitId = slot.defId;

        const reasons = [];

        for (const [playerId, roster] of Object.entries(playerRoster)) {
          const unit = roster.find((u) => u.id === unitId);

          if (!unit) {
            reasons.push({
              player: playerId,
              reason: "unit_missing",
            });
            continue;
          }

          if (unit.rarity < 7) {
            reasons.push({
              player: playerId,
              reason: "rarity_too_low",
              rarity: unit.rarity,
            });
            continue;
          }

          const combatType = unitCombatType[unitId];
          if (combatType !== 1 && combatType !== 2) {
            reasons.push({
              player: playerId,
              reason: "invalid_combat_type",
              combatType,
            });
            continue;
          }

          // Tier requirement
          const requiredTier = getRequiredTier(zoneId);
          if (combatType === 1 && unit.tier < requiredTier) {
            reasons.push({
              player: playerId,
              reason: "tier_too_low",
              tier: unit.tier,
              requiredTier,
            });
            continue;
          }

          // NEW: check if player already used this unit elsewhere
          const usedElsewhere = Object.values(solverOutput.placementsByZone)
            .flatMap((zoneOps) => Object.values(zoneOps).flat())
            .some(
              (entry) =>
                entry.player === playerId && entry.unit.defId === unitId,
            );

          if (usedElsewhere) {
            reasons.push({
              player: playerId,
              reason: "unit_already_used",
            });
            continue;
          }

          // NEW: check if player already placed 10 units in this operation
          const opPlacements =
            solverOutput.placementsByZone[zoneId]?.[opId] || [];
          const placementsByPlayer = opPlacements.filter(
            (p) => p.player === playerId,
          );

          if (placementsByPlayer.length >= 10) {
            reasons.push({
              player: playerId,
              reason: "operation_cap_reached",
              count: placementsByPlayer.length,
            });
            continue;
          }

          // If we reach here, player *could* have filled it
          reasons.push({
            player: playerId,
            reason: "eligible",
          });
        }

        missing[zoneId][opId].push({
          slotKey: slot.key,
          unitId,
          eligibility: reasons,
        });
      }
    }
  }

  return missing;
}
