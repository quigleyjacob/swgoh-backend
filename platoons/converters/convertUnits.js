// /utils/convertUnits.js

export function convertUnits(unitsJson) {
  const unitCombatType = {};
  const unitMetadata = {};
  //   const unitMap = {};

  for (const unit of unitsJson) {
    const { baseId, combatType } = unit;

    // Store full raw definition
    // unitMap[baseId] = unit;

    // Toon = 1, Ship = 2
    unitCombatType[baseId] = combatType;

    // Weight = 1 (you will override later)
    unitMetadata[baseId] = {
      weight: 1,
    };
  }

  return {
    unitCombatType,
    unitMetadata,
    // unitMap,
  };
}
