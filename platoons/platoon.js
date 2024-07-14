import fetch from 'node-fetch'
import Guild from './Guild.js'
import Phase from "./Phase.js"
import Strategy from "./Strategy.js"
import DB from '../lib/database.js'
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

function getSubsetsMap(maxLength, skipMask) {
    let array = [0]
    for(let i = 1; i < 2 ** maxLength; ++i) {
        array.push((i % 2 == 0 ? 0 : 1) + array[i >> 1])
    }
    let map = new Map()
    array.forEach((value, index) => {
        if((index & skipMask) === 0) {
            if(map.get(value)) {
                map.get(value).push(index)
            } else {
                map.set(value, [index])
            }
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

function binarySearch(guild, phase, skipMask) {
    let numZones = 4
    let length = 6 * numZones
    let shift = length / numZones
    let mask = (2 ** shift) - 1
    let combinationsMap = getSubsetsMap(length, skipMask)
    let ref = {
        score: 0,
        optimalPlacement: [],
        operations: new Map().set('Bonus', []).set('LS', []).set('Mix', []).set('DS', [])
    }
    let start = 0
    let end = length
    while(start <= end) {
        let mid = (start + end)/2>>0
        let combinations = combinationsMap.get(mid) || []
        let foundValueHere = false
        for(let i = 0; i < combinations.length; ++i) {
            let number = combinations[i]
            let ds = number & mask
            number >>= shift
            let mix = number & mask
            number >>= shift
            let ls = number & mask
            number >>= shift
            let bonus = number & mask
            let strat = new Strategy(phase, new Map().set("Bonus", numToArray(bonus)).set("LS", numToArray(ls)).set("Mix", numToArray(mix)).set("DS", numToArray(ds)), requiredRelic)
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
    let {guildId, tb, ds_phase, mix_phase, ls_phase, bonus_phase, skipMask, excludedPlayers} = payload
    const zoneNumber = {
        "Bonus": bonus_phase,
        "LS": ls_phase,
        "Mix": mix_phase,
        "DS": ds_phase
    }
    let guildData = await DB.getGuildData(guildId, false, true, {
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

    let platoons = await DB.getPlatoons(tb, bonus_phase, ls_phase, mix_phase, ds_phase)
    let phase = new Phase(zoneNumber, platoons)
    let guild = new Guild(guildData)
    let response = binarySearch(guild, phase, skipMask)
    response.operations = Object.fromEntries(response.operations)

    // determine skipped platoons
    response.skippedPlatoons = getPlatoonsFromMask(platoons, skipMask)

    // determine unfillable platoons here
    let optimalPlatoonMask = getAlreadyFilledMask([response.operations["Bonus"], response.operations["LS"], response.operations["Mix"], response.operations["DS"]])
    let cannotBeFilled = ~(optimalPlatoonMask | skipMask)

    response.remainingPlatoons = getPlatoonsFromMask(platoons, cannotBeFilled)

    let attemptStrategy = new Strategy(phase, undefined, requiredRelic, response.remainingPlatoons)
    let guildWithPlacements = new Guild(guildData, response.optimalPlacement)
    response.unableToFill = attemptStrategy.findUnfillable(guildWithPlacements)
    return response
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