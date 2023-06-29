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
            return (platoon.alignment == "Bonus" && this.operations.get("Bonus").includes(platoon.operation))
                || (platoon.alignment == "LS" && this.operations.get("LS").includes(platoon.operation)) 
                || (platoon.alignment == "Mix" && this.operations.get("Mix").includes(platoon.operation))
                || (platoon.alignment == "DS" && this.operations.get("DS").includes(platoon.operation))
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
            map[defId] = this.operationsToFill.filter(platoon => platoon.defId === defId).sort((a,b) => b.phase - a.phase)
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
    guildCanPlaceToon(guild, defId) {
        let placements = this.numNeededPerRelic(defId)
        let guildToonsPerRelic = guild.numToonPerRelic(defId)

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
        return this.operations.get("Bonus").length + this.operations.get("LS").length + this.operations.get("Mix").length + this.operations.get("DS").length
    }

    isValid(guild) {
        let toonsInPlatoon = [...new Set(this.operationsToFill.map(platoon => platoon.defId))]
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
        
        platoonPriority.forEach(toon => {
            let toBeAssigned = this.placementMap[toon.defId]
            toBeAssigned.forEach(platoon => {
                let placed = false
                for(let i = 0; i < guildMemberPriority.length; ++i) {
                    let member = guildMemberPriority[i]
                    let relic = this.requiredRelic[platoon.alignment][platoon.phase]
                    let zone = platoon.alignment
                    if(member.canPlace(platoon.defId, relic, zone)) {
                        member.assign(platoon, zone)
                        guildMemberPriority.push(guildMemberPriority.splice(i, 1)[0])
                        placed = true
                        break
                    }
                }
                if (!placed) {
                    console.log(platoon.defId, "guild cannot place this toon")
                    return false
                }
            })
        })
        return true
    }

    findUnfillable(guild) {
        let list = []
        this.operationsToFill.forEach(operation => {
            if(this.guildCanPlaceToon(guild, operation.defId) < 0) {
                list.push(operation)
            }
        })
        return list
    }
}