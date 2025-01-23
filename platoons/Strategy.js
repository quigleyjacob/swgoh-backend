export default class Strategy {
    constructor(phase, operations, requiredRelic, operationsToFill = undefined) {
        this.phase = phase
        this.operations = operations
        this.requiredRelic = requiredRelic
        this.operationsToFill = operationsToFill || this._initalizeOperations()
        this.placementMap = this._initializePlacementMap()
    }

    // return list of all platoons needed for this strategy
    _initalizeOperations() {
        let platoons = this.phase.platoons.filter(platoon => {
            let platoonOperationId = `${platoon.alignment}:${platoon.phase}:${platoon.operation}`
            return this.operations.includes(platoonOperationId)
        })
        return platoons
    }
    // returns map of platoons
    // key is the id of the toon
    // value is an array of all platoons for this toon
    _initializePlacementMap() {
        let map = {}
        let toonDefIds = [...new Set(this.operationsToFill.map(platoon => platoon.defId))]
        toonDefIds.forEach(defId => {
            map[defId] = this.operationsToFill.filter(platoon => platoon.defId === defId).sort((a,b) => this.requiredRelic[b.alignment][b.phase] - this.requiredRelic[a.alignment][a.phase])
        })
        return map
    }

    numRequiredInZone(defId, zone) {
        return this.operationsToFill.get(zone).filter(platoon => platoon.defId === defId).length
    }

    numRequired(defId) {
        return this.placementMap[defId].length
    }

    // looks at all platoons in this strategy and returns a map of number needed at each relic level
    numNeededPerRelic(defId) {
        let platoonAssigments = this.placementMap[defId]
        let map = new Map().set(7, 0).set(8, 0).set(9, 0).set(10, 0).set(11, 0)
        platoonAssigments.forEach(platoon => {
            let phase = platoon.phase
            let minRelic = this.requiredRelic[platoon.alignment][phase]
            map.set(minRelic, map.get(minRelic) + 1)
        })
        return map
    }
    // return -1 if guild cannot place this toon
    // else, return number leftover that is at least minimum relic required
    // this method does not take into account already existing placements
    guildCanPlaceToon(guild, defId, operation = undefined) {
        let placements = this.numNeededPerRelic(defId)
        let guildToonsPerRelic = guild.numToonPerRelic(defId, operation)

        let requiredRelicsReversed = [11, 10, 9, 8, 7]

        for(let i = 0; i < requiredRelicsReversed.length; ++i) {
            let relic = requiredRelicsReversed[i]
            let guildToonsAtRelic = guildToonsPerRelic.get(relic)
            let placementsAtRelic = placements.get(relic)
            if(placementsAtRelic > guildToonsAtRelic) {
                return -1
            } else {
                // need to subtract from other relic levels the amount needed at this relic level
                for(let j = i; j < requiredRelicsReversed.length; ++j) {
                    let relicToAdjust = requiredRelicsReversed[j]
                    guildToonsPerRelic.set(relicToAdjust, guildToonsPerRelic.get(relicToAdjust) - placementsAtRelic)
                }
            }
        }
        let minRelic = Math.min(...Array.from(placements.keys()).filter(key => placements.get(key) > 0))
        return guildToonsPerRelic.get(minRelic)
    }

    getScore() {
        return this.operations.length
    }

    isValid(guild) {
        let toonsInPlatoon = Object.keys(this.placementMap)
        let platoonPriority = []
        for(let i = 0; i < toonsInPlatoon.length; ++i) {
            let defId = toonsInPlatoon[i]
            let delta = this.guildCanPlaceToon(guild, defId)
            if(delta < 0) {
                return false
            }
            platoonPriority.push({"defId": defId, "delta": delta})
        }
        platoonPriority = platoonPriority.sort((a,b) => a.delta - b.delta)

        let guildMemberPriority = guild.roster.sort((a,b) => a.sort(b, toonsInPlatoon, this.placementMap, this.requiredRelic))
        
        for(const toon of platoonPriority) {
            let toBeAssigned = this.placementMap[toon.defId]
            for(const platoon of toBeAssigned) {
                let placed = false
                for(let i = 0; i < guildMemberPriority.length; ++i) {
                    let member = guildMemberPriority[i]
                    let relic = this.requiredRelic[platoon.alignment][platoon.phase]
                    let zoneId = `${platoon.alignment}:${platoon.phase}`
                    if(member.canPlace(platoon.defId, relic, zoneId)) {
                        member.assign(platoon, zoneId)
                        guildMemberPriority.push(guildMemberPriority.splice(i, 1)[0])
                        placed = true
                        break
                    }
                }
                if (!placed) {
                    console.log(platoon.defId, "guild cannot place this toon")
                    return false
                }
            }
        }
        return true
    }

    findUnfillable(guild) {
        let list = []
        this.operationsToFill.forEach(operation => {
            if(this.guildCanPlaceToon(guild, operation.defId, operation) < 0) {
                list.push(operation)
            }
        })
        return list
    }
}