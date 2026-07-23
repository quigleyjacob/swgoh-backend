import { test, requiredRelic, getSubsetsMap, getAlreadyFilledMask, numToArray } from "./utils.js"
import Strategy from "../classes/Strategy.js"


export function binarySearch(guild, phase) {
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

export function binarySearchV2(guild, phase, removedOperations, baselineOperationList) {
    let ref = {
        score: 0,
        optimalPlacement: [],
        operations: []
    }
    if(baselineOperationList.length === 0) {
        return ref
    }
    
    let length = removedOperations.length

    let combinationsMap = getSubsetsMap(length)



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