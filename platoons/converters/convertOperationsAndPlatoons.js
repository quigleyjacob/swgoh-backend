// /utils/convertOperationsAndPlatoons.js

export function convertOperationsAndPlatoons(operationJson, platoonsJson) {
  // const ops = [];

  // for (const op of operationJson) {
    const zones = [];
    for (const zoneId of operationJson.zones) {
      const zone = {
        id: zoneId,
        operations: {},
        excludedPlatoons: operationJson.excludedPlatoons ?? [],
        excludedPlayers: operationJson.excludedPlayers ?? [],
      };

      // Build lookup set
      const excludedSet = new Set(zone.excludedPlatoons);

      for (const platoon of platoonsJson) {
        const { alignment, phase, operation, row, slot, defId } = platoon;

        // Construct keys
        const fullKey = `${alignment}:${phase}:${operation}:${row}:${slot}`;
        const rowKey = `${alignment}:${phase}:${operation}:${row}`;
        const opKey = `${alignment}:${phase}:${operation}`;
        const zoneKey = `${alignment}:${phase}`;

        // Only include platoons belonging to this zone
        if (zoneKey !== zoneId) continue;

        // Exclusion logic
        if (
          excludedSet.has(fullKey) ||
          excludedSet.has(rowKey) ||
          excludedSet.has(opKey)
        ) {
          continue;
        }

        // Ensure operation bucket exists
        if (!zone.operations[operation]) {
          zone.operations[operation] = [];
        }

        // Add required unit
        zone.operations[operation].push({ defId, key: fullKey });
      }

      zones.push(zone);
    }
    return {zones}
    // ops.push({ zones });
  // }

  // return ops;
}
