import Data from "../../lib/database/data.js"
import Operation from "../../lib/database/guild/operation.js"
import { mergeExcludedPlatoons } from "./mergeExcludedPlatoons.js"

export async function getExcludedPlatoons(zones, excludedPlatoons, previousOperationId, guildId) {
    if(previousOperationId) {
        let previousOperation = await Operation.getOperation(previousOperationId, guildId)
        if(previousOperation) {
            return mergeExcludedPlatoons(zones, excludedPlatoons, previousOperation, guildId)
        } 
    }
    return excludedPlatoons
}

export function getBaselineOperationList(zones, removedOperations, excludedOperations) {
    let list = []
    zones.forEach(zoneId => {
        for(let i = 1; i <= 6; ++i) {
            let operationId = `${zoneId}:${i}`
            if(!removedOperations.includes(operationId) && !excludedOperations.includes(operationId)) {
                list.push(operationId)
            }
        }
    })
    return list
}

export async function getSkippedPlatoons(tb, excludedPlatoons) {
    if(excludedPlatoons.length === 0) {
        return []
    }
    return await Data.getPlatoons(tb, excludedPlatoons)
}

export function getRemainingPlatoons(platoons, skippedOperations) {
    // from the platoons list, get the platoons that are in the skipped operations list, but not in the excluded platoons list
    return platoons.filter(platoon => {
        let operationId = `${platoon.alignment}:${platoon.phase}:${platoon.operation}`
        return skippedOperations.includes(operationId)
    })
}

export function getRemainingOperations(zones, operations, skippedOperations) {
    let list = []
    zones.forEach(zoneId => {
        for(let operation = 1; operation <= 6; ++operation) {
            let operationId = `${zoneId}:${operation}`
            if(!operations.includes(operationId) && !skippedOperations.includes(operationId)) {
                list.push(operationId)
            }
        }
    })
    return list
}

// index 0 is a burner value as phase 0 does not exist
export const requiredRelic = {
    "Bonus": [0, 9, 10],
    "LS": [0, 7, 8, 9, 10, 11, 11],
    "Mix": [0, 7, 8, 9, 10, 11, 11],
    "DS": [0, 7, 8, 9, 10, 11, 11]
} // relic tier + 2 to handle the way the backend data is structured

export function getAlreadyFilledMask(arrays) {
    let number = 0
    arrays.forEach(array => {
        number <<= 6
        array.forEach(element => {
            number += (1 << (element-1))
        })
    })
    return number
}

export function getSubsetsMap(maxLength) {
    if(maxLength > 24) {
        throw Error('Number too big to generate subset maps')
    }
    let array = [0]
    for(let i = 1; i < 2 ** maxLength; ++i) {
        array.push((i % 2 == 0 ? 0 : 1) + array[i >> 1])
    }
    let map = new Map()
    array.forEach((value, index) => {
        if(map.get(value)) {
            map.get(value).push(index)
        } else {
            map.set(value, [index])
        }
    })
    return map
}

export function test(guild, strat, ref) {
    let valid = strat.isValid(guild)
    if(valid && strat.getScore() > ref.score) {
        ref.operations = strat.operations
        ref.score = strat.getScore()
        ref.optimalPlacement = guild.placements()
    }
    guild.reset()
    return valid
}

export function numToArray(number) {
    let array = []
    let i = 1
    while(number > 0) {
        if (number % 2 === 1) {
            array.push(i)
        }
        ++i
        number >>= 1
    }
    return array
}