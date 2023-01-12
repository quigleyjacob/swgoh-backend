import fetch from 'node-fetch'
import Guild from './Guild.js'
import Phase from "./Phase.js"
import Strategy from "./Strategy.js"
import DB from '../lib/database.js'
// index 0 is a burner value as phase 0 does not exist
const requiredRelic = [0, 7, 8, 9, 10, 11, 11] // relic tier + 2 to handle the way the backend data is structured
const zoneNumber = {
    "LS": 1,
    "Mix": 1,
    "DS": 1
}
const alreadyFilled = [
    [0,0,0,0,0,0], //DS (6,5,4,3,2,1)
    [0,0,0,0,0,0], //Mix (6,5,4,3,2,1)
    [0,0,0,0,0,0]  //LS (6,5,4,3,2,1)
] // in reverse to maintain that DS are highest 6 bits, mix are middle 6 bits, and LS are lowest six bits in same order as already implemented

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
    let array = [0]
    for(let i = 1; i < 2 ** maxLength; ++i) {
        array.push((i % 2 == 0 ? 0 : 1) + array[i >> 1])
    }
    let map = new Map()
    array.forEach((value, index) => {
        let alreadyFilledMask = getAlreadyFilledMask(alreadyFilled)
        if((index & alreadyFilledMask) === 0) {
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
        array.forEach(element => {
            number <<= 1
            number += element
        })
    })
    return number
}

function binarySearch(guild, phase) {
    let length = 18
    let shift = length / 3
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
        let combinations = combinationsMap.get(mid)
        let foundValueHere = false
        for(let i = 0; i < combinations.length; ++i) {
            let number = combinations[i]
            let ls = number & mask
            number >>= shift
            let mix = number & mask
            number >>= shift
            let ds = number & mask
            let strat = new Strategy(phase, new Map().set("LS", numToArray(ls)).set("Mix", numToArray(mix)).set("DS", numToArray(ds)), requiredRelic)
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
    let {guildId, tb, ds_phase, mix_phase, ls_phase} = payload
    let guildData = await DB.getGuildData(guildId, false, true, "platoons")
    let platoons = await DB.getPlatoons(tb, ls_phase, mix_phase, ds_phase)
    let phase = new Phase(zoneNumber, platoons)
    let guild = new Guild(guildData)
    let response = binarySearch(guild, phase)
    response.operations = Object.fromEntries(response.operations)
    return response
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