import { getRequiredTier } from "./getRequiredTier.js";

/**
 * Find unfillable platoon slots:
 * A slot is unfillable if NO player is eligible to place the required unit.
 *
 * Returns an array of:
 * {
 *   defId,
 *   zoneId,
 *   opId,
 *   slotKey,
 *   reason: "no_eligible_players"
 * }
 */
export function findUnfillableToons(missing) {
  const unfillable = [];

  for(const zonePlacements of Object.values(missing)) {
    for(const operationPlacement of Object.values(zonePlacements)) {
      operationPlacement.forEach(({slotKey, eligibility}) => {
        let canPlace = eligibility.some(player => player.reason === 'eligible')
        if(!canPlace) {
          unfillable.push(slotKey)
        }
      })
    }
  }

  return unfillable;
}
