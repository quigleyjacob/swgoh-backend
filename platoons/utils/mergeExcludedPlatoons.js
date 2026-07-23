export function mergeExcludedPlatoons(zones, excludedPlatoons, previousOperation, guildId) {
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