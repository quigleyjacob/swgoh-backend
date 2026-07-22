// counterUrls.js

export function getRegularCounterUrl({
  squadData,
  isFleet,
  eventInstanceId
}) {
  const route = isFleet ? "ship-counters" : "counters";
  const url = `https://swgoh.gg/gac/${route}`;

  let leader = "";
  let member = "";
  let reinforcement = "";

  squadData.squad.forEach(({ baseId }, index) => {
    if (index === 0) {
      leader = baseId;
    } else if (isFleet && index > 3) {
      reinforcement += `${baseId}%2C`;
    } else {
      member += `${baseId}%2C`;
    }
  });

  const useMember = member.length > 0;
  const useReinforce = reinforcement.length > 0;
  const useEventInstanceId = eventInstanceId?.length > 0;

  if (useMember) member = member.slice(0, -3);
  if (useReinforce) reinforcement = reinforcement.slice(0, -3);

  const query =
    useMember || useReinforce || useEventInstanceId
      ? "?"
      : "";

  const season = useEventInstanceId
    ? `season_id=${eventInstanceId}&`
    : "";

  const members = useMember
    ? `d_member=${member}&`
    : "";

  const reinforcements = useReinforce
    ? `d_reinforcement=${reinforcement}`
    : "";

  return `${url}/${leader}${query}${season}${members}${reinforcements}`;
}

export function getInsightCounterUrl({
  enemySquadData,
  opponentDatacrons,
  activeGac,
  isFleet,
  affixTextMap,
  units
}) {
  const enemySquad = enemySquadData?.squad || [];

  const enemyDatacron = opponentDatacrons.find(
    d => d.id === enemySquadData?.datacron
  );

  const enemySquadBaseIdList = enemySquad.map(u => u.baseId);
//   const allySquadBaseIdList = allySquad.map(u => u.baseId);

  const url = "https://swgoh.gg/gac/insight/battles";

  const base = { key: "g", value: 1 };
  const combatType = isFleet ? { key: "combat_type", value: 2 } : undefined;
  const league = { key: "league", value: activeGac.league };
  const squadSize = isFleet ? undefined : { key: "squad_size", value: activeGac.mode };
  const showCleanups = { key: "show_cleanups", value: false };
  const isEnemyLeaderDead =
    enemySquad.length > 0 && !enemySquad[0].isAlive
      ? { key: "d_is_lead", value: true }
      : undefined;
  const enemyLeader = getLeader(enemySquad, "d", activeGac);
  const enemyMembers = getSquadMembers(enemySquad, "d", isFleet);
  const enemyReinforcements = getReinforcements(enemySquad, "d", isFleet);
  const enemyDatacronQuery = getDatacron(
    enemyDatacron,
    "d",
    enemySquadBaseIdList,
    affixTextMap,
    units,
    isFleet
  );

  const allyLeaders = getLeader([], 'a', activeGac)

  const excludeExpired = { key: "exclude_expired_datacrons", value: true };

  const query =
    "?" +
    [
      base,
      combatType,
      league,
      squadSize,
      showCleanups,
      isEnemyLeaderDead,
      allyLeaders,
      enemyLeader,
      enemyMembers,
      enemyReinforcements,
      enemyDatacronQuery,
      excludeExpired
    ]
      .filter(Boolean)
      .map(({ key, value }) => `${key}=${encodeURIComponent(value)}`)
      .join("&");

  return `${url}/${query}`;
}

function getLeader(squad, side, activeGac) {
  if (side === "a") {
    const usedUnits = [
      squad.length > 0 ? squad[0].baseId : undefined,
      ...Object.values(activeGac.homeStatus)
        .filter(v => v?.squad?.length > 0)
        .map(v => `-${v.squad[0].baseId}`)
    ]
      .filter(Boolean)
      .join(",");

    return { key: `${side}_lead`, value: usedUnits };
  }

  return squad.length > 0
    ? { key: `${side}_lead`, value: squad[0].baseId }
    : undefined;
}

function getSquadMembers(squad, side, isFleet) {
  const slice = isFleet ? squad.slice(1, 4) : squad.slice(1);
  const value = slice
    .filter(u => u.isAlive ?? true)
    .map(u => u.baseId)
    .join(",");

  return value ? { key: `${side}_member`, value } : undefined;
}

function getReinforcements(squad, side, isFleet) {
  if (!isFleet) return undefined;

  const value = squad
    .slice(4)
    .filter(u => (u.isAlive ?? true) && u.baseId !== "HIDDEN")
    .map(u => u.baseId)
    .join(",");

  return value ? { key: `${side}_reinforcement`, value } : undefined;
}

function getDatacron(datacron, side, squadBaseIdList, affixTextMap, units, isFleet) {
  if (isFleet || !datacron) return undefined;

  const bonuses = [2, 5, 8, 11, 14]
    .map(i => {
      if (datacron.affix.length <= i) return undefined;

      const affix = datacron.affix[i];
      const bonus = getBonus(affixTextMap, affix.targetRule, affix.abilityId);

      const categoryId = bonus.categoryId;
      const matches = units.some(
        u => squadBaseIdList.includes(u.baseId) && u.categoryId.includes(categoryId)
      );

      return matches ? `${affix.targetRule}:${affix.abilityId}` : undefined;
    })
    .filter(Boolean)
    .join(",");

  return bonuses
    ? { key: `${side}_datacron_pkeys`, value: bonuses }
    : undefined;
}

function getBonus(affixTextMap, targetRule, abilityId) {
    let key = `${abilityId}:${targetRule}`
    return affixTextMap[key]
    // for(const datacronSet of datacrons) {
    //     for (const tier of datacronSet.tier) {
    //         if(tier.bonuses) {
    //             for(const bonusGroup of tier.bonuses) {
    //                 for(const bonus of bonusGroup) {
    //                     if(bonus.abilityId === abilityId && bonus.targetRule === targetRule) {
    //                         return bonus
    //                     }
    //                 }
    //             }
    //         }
    //     }
    // }
}


