import fetch from 'node-fetch'
import Guild from './classes/Guild.js'
import Phase from "./classes/Phase.js"
import Strategy from "./classes/Strategy.js"
import GuildData from '../lib/database/guild/guild.js'
import Operation from '../lib/database/guild/operation.js'
import Data from '../lib/database/data.js'
import { mergeExcludedPlatoons } from './utils/mergeExcludedPlatoons.js'
import { binarySearchV2 } from './utils/binarySearch.js'
import { getBaselineOperationList, getSkippedPlatoons, getRemainingOperations, getRemainingPlatoons, getExcludedPlatoons } from './utils/utils.js'
import { requiredRelic } from './utils/utils.js'
import player from '../lib/database/player/player.js'
import { convertOperationsAndPlatoons } from './converters/convertOperationsAndPlatoons.js'
import { convertUnits } from './converters/convertUnits.js'
import { convertPlayers } from './converters/convertPlayers.js'
import { runSolver } from './solver/solverRunner.js'
import { analyzeDroppedOperations } from './utils/analyzeDroppedOperations.js'
import fs from 'fs'
import path from "path";
import { computeUnitDeltaArray } from './utils/computeUnitDeltaArray.js'
import { findUnfillableToons } from './utils/findUnfillableToons.js'

export async function getIdealPlatoonsV2(payload) {
    let {guildId, tb, zones, excludedPlatoons, excludedPlayers, previousOperation: previousOperationId } = payload
    excludedPlatoons = await getExcludedPlatoons(zones, excludedPlatoons, previousOperationId, guildId)

    let guild = await GuildData.getGuild(guildId)
    let allyCodes = guild.member
        .filter(member => !excludedPlayers.includes(member.allyCode))
        .map(member => member.allyCode)

    let accounts = await player.getPlayers(allyCodes, {
        _id: 0,
        name: 1,
        allyCode: 1,
        rosterUnit: {
            currentRarity: 1,
            relic: 1,
            baseId: 1
        }
    }, 'allyCode')

    let units = await Data.getUnits({_id: 0, baseId: 1, combatType: 1})

    let platoons = await Data.getPlatoons(tb, zones, excludedPlatoons)

    let operationsMap = platoons.reduce((obj, op) => {
        let key = `${op.alignment}:${op.phase}:${op.operation}:${op.row}:${op.slot}`
        obj[key] = op
        return obj
    }, {})

    let operation = convertOperationsAndPlatoons({zones, excludedPlatoons, excludedPlayers}, platoons)

    let { unitCombatType, unitMetadata } = convertUnits(units)

    let { players, playerRoster, playerWillingness, playerName } = convertPlayers(accounts)

    const groups = [
        {
            name: "Jedi",
            type: "attractive",
            units: ["GRANDMASTERLUKE", "JEDIKNIGHTLUKE"],
        },
        {
            name: "at_most_one_gl_ship",
            type: "repulsive",
            units: ["CAPITALPROFUNDITY", "CAPITALEXECUTOR", "CAPITALLEVIATHAN"],
        },
        {
            name: "at_most_one_ls_gl",
            type: "repulsive",
            units: ["GLREY", "GRANDMASTERLUKE", "JEDIMASTERKENOBI"],
        },
        {
            name: "at_most_one_ds_gl",
            type: "repulsive",
            units: ["SUPREMELEADERKYLOREN", "SITHPALPATINE", "LORDVADER"],
        },
    ];

    const results = await runSolver({
        operation,
        players,
        playerRoster,
        unitMetadata,
        unitCombatType,
        groups,
        playerWillingness
    })

    const missing = analyzeDroppedOperations(operation, results, playerRoster, unitCombatType)

    // writeResultFile({results, missing})

    let score = results.Kstar
    let optimalPlacement = players.map(allyCode => {
        let playerPlacement = results.perPlayerSummary[allyCode]
        let zonesList = Object.keys(playerPlacement.zones)
        return {
            name: playerName[allyCode],
            allyCode,
            placements: zonesList
                .reduce((obj, zone) => {
                    let placements = Object.values(playerPlacement.zones[zone])
                        .flatMap(item => item)
                        .map(({key}) => operationsMap[key])
                    obj[zone] = placements
                    return obj
                }, {})
        }
    })

    let operations = Object.entries(results.placementsByZone).map(([zone, placements]) => 
        Object.entries(placements).map(([op, arr]) => 
            arr?.length !== 0 ? `${zone}:${op}` : undefined
        ).filter(val => val)
    ).flat()

    let deltaList = computeUnitDeltaArray(operation, playerRoster, unitCombatType).sort((a,b) => a.delta - b.delta)

    let skippedPlatoons = await getSkippedPlatoons(tb, excludedPlatoons)

    let skippedOperations = excludedPlatoons.filter(id => {
        let arr = id.split(':')
        return arr.length === 3
    })

    let remainingOperations = getRemainingOperations(zones, operations, skippedOperations)

    let remainingPlatoons = getRemainingPlatoons(platoons, remainingOperations)

    let unableToFill = findUnfillableToons(missing).map(key => operationsMap[key])

    return {
        score,
        optimalPlacement,
        operations,
        deltaList,
        skippedPlatoons,
        skippedOperations,
        remainingOperations,
        remainingPlatoons,
        unableToFill
    }
}

export async function getIdealPlatoons(payload) {
    let {guildId, tb, zones, excludedPlatoons, excludedPlayers, previousOperation } = payload
    excludedPlatoons = await getExcludedPlatoons(zones, excludedPlatoons, previousOperation, guildId)

    let guildData = await GuildData.getGuild(guildId, false, true, {
        name: 1,
        allyCode: 1,
        rosterUnit: {
            definitionId: 1,
            currentRarity: 1,
            currentLevel: 1,
            currentTier: 1,
            relic: {
                currentTier: 1
            }
        }
    })

    let platoons = await Data.getPlatoons(tb, zones, excludedPlatoons)

    guildData.roster = guildData.roster.filter(playerData => !(excludedPlayers || []).includes(playerData.allyCode))

    


    let phase = new Phase(zones, platoons)
    let guild = new Guild(guildData, zones)

    let testing = new Strategy(phase, undefined, requiredRelic, platoons)
    let filteredPlatoons = JSON.parse(JSON.stringify(platoons))
    let unfillable = testing.findUnfillable(guild)
    let removedOperations = []
    while(unfillable.length > 0) {
        let toRemove = unfillable[0]
        let operationToRemoveId = `${toRemove.alignment}:${toRemove.phase}:${toRemove.operation}`
        removedOperations.push(operationToRemoveId)
        filteredPlatoons = filteredPlatoons.filter(platoon => {
            return platoon.alignment !== toRemove.alignment
                || platoon.phase !== toRemove.phase
                || platoon.operation !== toRemove.operation
        })

        testing = new Strategy(phase, undefined, requiredRelic, filteredPlatoons)
        unfillable = testing.findUnfillable(guild)
    }

    let excludedOperations = excludedPlatoons.filter(id => {
        let arr = id.split(':')
        return arr.length === 3
    })

    let baselineOperationList = getBaselineOperationList(zones, removedOperations, excludedOperations)

    let response = binarySearchV2(guild, phase, removedOperations, baselineOperationList)

    let originalStrategy = new Strategy(phase, undefined, requiredRelic, platoons)

    response.deltaList = originalStrategy.getDeltas(guild)

    response.skippedPlatoons = await getSkippedPlatoons(tb, excludedPlatoons)

    response.skippedOperations = excludedOperations

    response.remainingOperations = getRemainingOperations(zones, response.operations, response.skippedOperations)

    response.remainingPlatoons = getRemainingPlatoons(platoons, response.remainingOperations)


    let attemptStrategy = new Strategy(phase, undefined, requiredRelic, response.remainingPlatoons)
    let guildWithPlacements = new Guild(guildData, zones, response.optimalPlacement)
    response.unableToFill = attemptStrategy.findUnfillable(guildWithPlacements)
    return response
}

/**
 * Writes a JSON-serializable object to results/response-<new Date()>.json
 * Returns the full file path.
 */
function writeResultFile(data, resultsDir = "results") {
  // Ensure results directory exists
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  // JS-style new Date()
  const timestamp = Date.now();
  const filename = `response-${timestamp}.json`;
  const filepath = path.join(resultsDir, filename);

  // Write JSON file
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), "utf8");

  return filepath;
}
