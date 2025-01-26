import fetch from 'node-fetch'
import Guild from './Guild.js'
import Phase from "./Phase.js"
import Strategy from "./Strategy.js"
import GuildData from '../lib/database/guild/guild.js'
import Operation from '../lib/database/guild/operation.js'
import Data from '../lib/database/data.js'
// index 0 is a burner value as phase 0 does not exist
const requiredRelic = {
    "Bonus": [0, 9, 10],
    "LS": [0, 7, 8, 9, 10, 11, 11],
    "Mix": [0, 7, 8, 9, 10, 11, 11],
    "DS": [0, 7, 8, 9, 10, 11, 11]
} // relic tier + 2 to handle the way the backend data is structured


function numToArray(number) {
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

function test(guild, strat, ref) {
    let valid = strat.isValid(guild)
    if(valid && strat.getScore() > ref.score) {
        ref.operations = strat.operations
        ref.score = strat.getScore()
        ref.optimalPlacement = guild.placements()
    }
    guild.reset()
    return valid
}

function getSubsetsMap(maxLength) {
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

function getAlreadyFilledMask(arrays) {
    let number = 0
    arrays.forEach(array => {
        number <<= 6
        array.forEach(element => {
            number += (1 << (element-1))
        })
    })
    return number
}

function binarySearch(guild, phase) {
    let numZones = phase.zonesList.length
    let length = 6 * numZones
    let shift = length / numZones
    let mask = (2 ** shift) - 1
    let combinationsMap = getSubsetsMap(length)

    let ref = {
        score: 0,
        optimalPlacement: [],
        operations: []
    }
    let start = 0
    let end = length
    while(start <= end) {
        let mid = (start + end)/2>>0
        let combinations = combinationsMap.get(mid) || []
        let foundValueHere = false
        for(let i = 0; i < combinations.length; ++i) {
            let number = combinations[i]
            let operationList = phase.zonesList.reduce((map, zoneId) => {
                let platoonNumber = number & mask
                number >>= shift
                return [...map, ...numToArray(platoonNumber).map(operation => `${zoneId}:${operation}`)]
            }, [])
            let strat = new Strategy(phase, operationList, requiredRelic)
            if(test(guild, strat, ref)) {
                foundValueHere = true
                break
            }
        }
        if(foundValueHere) {
            start = mid + 1
        } else {
            end = mid - 1
        }
    }
    return ref
}

function binarySearchV2(guild, phase, removedOperations, baselineOperationList) {
    let length = removedOperations.length

    let combinationsMap = getSubsetsMap(length)

    let ref = {
        score: 0,
        optimalPlacement: [],
        operations: []
    }

    let start = 0
    let end = length
    while(start <= end) {
        let mid = (start + end)/2>>0
        let combinations = combinationsMap.get(mid) || []
        let foundValueHere = false
        for(let i = 0; i < combinations.length; ++i) {
            let number = combinations[i]
            let toAdd = []
            for(let i = 0; i < length; ++i) {
                if(number & 1 === 1) {
                    toAdd.push(removedOperations[i])
                }
                number >>= 1
            }
            let operationList = [...baselineOperationList, ...toAdd]
            let strat = new Strategy(phase, operationList, requiredRelic)
            if(test(guild, strat, ref)) {
                foundValueHere = true
                break
            }

        }
        if(foundValueHere) {
            start = mid + 1
        } else {
            end = mid - 1
        }
    }
    return ref
}

export async function getIdealPlatoons(payload) {
    let {guildId, tb, zones, excludedPlatoons, excludedPlayers, previousOperation} = payload

    if(previousOperation !== '') {
        excludedPlatoons = await mergeExcludedPlatoons(zones, excludedPlatoons, previousOperation)
    }
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
    guildData.roster = guildData.roster.filter(playerData => !(excludedPlayers || []).includes(playerData.allyCode))
    let excludedOperations = excludedPlatoons.filter(id => {
        let arr = id.split(':')
        return arr.length === 3
    })

    let platoons = await Data.getPlatoons(tb, zones, excludedPlatoons)
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

    let baselineOperationList = getBaselineOperationList(zones, removedOperations, excludedOperations)

    let response = binarySearchV2(guild, phase, removedOperations, baselineOperationList)

    // let response = binarySearch(guild, phase)

    // determine skipped platoons
    response.skippedPlatoons = await getSkippedPlatoons(tb, excludedPlatoons)

    response.skippedOperations = excludedOperations

    response.remainingOperations = getRemainingOperations(zones, response.operations, response.skippedOperations)

    response.remainingPlatoons = getRemainingPlatoons(platoons, response.remainingOperations)


    let attemptStrategy = new Strategy(phase, undefined, requiredRelic, response.remainingPlatoons)
    let guildWithPlacements = new Guild(guildData, zones, response.optimalPlacement)
    response.unableToFill = attemptStrategy.findUnfillable(guildWithPlacements)
    return response
}

function getBaselineOperationList(zones, removedOperations, excludedOperations) {
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

async function getSkippedPlatoons(tb, excludedPlatoons) {
    if(excludedPlatoons.length === 0) {
        return []
    }
    return await Data.getPlatoons(tb, excludedPlatoons)
}

function getRemainingPlatoons(platoons, skippedOperations) {
    // from the platoons list, get the platoons that are in the skipped operations list, but not in the excluded platoons list
    return platoons.filter(platoon => {
        let operationId = `${platoon.alignment}:${platoon.phase}:${platoon.operation}`
        return skippedOperations.includes(operationId)
    })
}

function getRemainingOperations(zones, operations, skippedOperations) {
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

async function mergeExcludedPlatoons(zones, excludedPlatoons, previousOperationId) {
    if(previousOperationId === undefined) {
        return excludedPlatoons
    }
    let previousOperation = await Operation.getOperation(previousOperationId, {})

    if(!previousOperation) {
        return excludedPlatoons
    }

    let previousOperationExcludedPlatoons = previousOperation.excludedPlatoons

    let commonZones = zones.filter(value => previousOperation.zones.includes(value))
    if(commonZones.length === 0) {
        return excludedPlatoons
    }
    let operationList = commonZones.map(zoneId => {
        return [1,2,3,4,5,6].reduce((arr, operation) => {
            let operationId = `${zoneId}:${operation}`
            if(previousOperationExcludedPlatoons.some(platoonId => platoonId.includes(operationId))) {
                
                if(!previousOperationExcludedPlatoons.includes(operationId)) {
                    // add complement of platoons included
                    let excludedPlatoonsInOperation = previousOperationExcludedPlatoons.filter(platoonId => platoonId.includes(operationId))
                    let includedPlatoonsInOperation = [1,2,3].map(row => [1,2,3,4,5].map(slot => `${operationId}:${row}:${slot}`)).flat().filter(id => !excludedPlatoonsInOperation.includes(id))
                    return [...arr, ...includedPlatoonsInOperation]
                } else {
                    // entire platoon was excluded last phase, included this phase
                    return arr
                }
            } else {
                // no mention of this operation in exclusion, so was completely filled last phase
                return [...arr, operationId]
            }
        }, [])
    }).flat()

    let newOperationList = [...operationList, ...excludedPlatoons]

    //if operation id is present, remove all platoon id contained under it
    let operationIdInList = newOperationList.filter(id => id.split(':').length === 3)
    operationIdInList.forEach(operationId => {
        newOperationList = newOperationList.filter(id => !id.includes(operationId) || id === operationId)
    })

    //if all 15 platoon id are present, substitute with operation id
    let map = newOperationList.reduce((map, id) => {
        if(id.split(':').length === 5) {
            let operationId = id.split(':').slice(0,3).join(':')
            if(map[operationId]) {
                map[operationId].push(id)
            } else {
                map[operationId] = [id]
            }
        }
        return map
    }, {})
    Object.keys(map).forEach(operationId => {
        if(map[operationId].length === 15) {
            newOperationList = newOperationList.filter(id => !map[operationId].includes(id))
            newOperationList.push(operationId)
        }
    })

    return newOperationList

}

function getPlatoonsFromMask(platoons, mask) {
    let ds = numToArray(mask & 63)
    let mix = numToArray((mask >> 6) & 63)
    let ls = numToArray((mask >> 12) & 63)
    let bonus = numToArray((mask >> 18) & 63)
    return  [...platoons["DS"].filter(it => ds.includes(it.operation)), ...platoons["Mix"].filter(it => mix.includes(it.operation)), ...platoons["LS"].filter(it => ls.includes(it.operation)), ...platoons["Bonus"].filter(it => bonus.includes(it.operation))]
}

// each operations parameter is a length 6 array for each operation checking for fill (1 means want to fill, 0 means don't want to fill)
// returns object, isValid boolean, missing array if invalid
async function canFillPlatoons(guildId, ls_phase, ls_operations, mix_phase, mix_operations, ds_phase, ds_operations) {
    let guildData = await (await fetch(`http://localhost:8080/api/guild/${guildId}?detailed=true&projection=platoons`)).json()
    let platoons = await (await fetch(`http://localhost:8080/api/platoon/ROTE/${ls_phase}/${mix_phase}/${ds_phase}`)).json()
    let phase = new Phase({"LS": ls_phase, "Mix": mix_phase, "DS": ds_phase}, platoons)
    let strat = new Strategy(phase, new Map().set("LS", ls_operations).set("Mix", mix_operations).set("DS", ds_operations), requiredRelic)
    let guild = new Guild(guildData)
    console.log(strat.isValid(guild))
}