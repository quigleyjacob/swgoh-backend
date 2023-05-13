export default class Player {
    constructor(playerData, placement = undefined) {
        this.allyCode = playerData.allyCode
        this.roster = playerData.rosterMap
        this.name = playerData.name
        this.placements = placement || this._initializePlacements()
        this.attempted = this._initializePlacements()
    }

    _initializePlacements() {
        return {
            "LS": [],
            "Mix": [],
            "DS": []
        }
    }

    totalPossiblePlacements(defIdList, phase) {
        let number = 0
        defIdList.forEach(defId => {
            number += this.meetsRelicRequirement(defId, phase) && !this.toonAlreadyPlacedAnywhere(defId) ? 1 : 0
        })
        return number
    }

    canPlace(defId, relic, zone) {
        if(this.toonAlreadyPlacedAnywhere(defId)) { // cannot place again if already placed elsewhere
            return false
        }
        if(this.maxPlacement(zone)) { // cannot place more than maximum amount
            return false
        }
        return this.meetsRelicRequirement(defId, relic)
    }

    canPlaceAnywhere(defId, phase) {
        if(this.toonAlreadyPlacedAnywhere(defId)) { // cannot place again if already placed elsewhere
            return false
        }
        return this.meetsRelicRequirement(defId, phase)
    }

    meetsRelicRequirement(defId, relic) {
        let toon = this.roster[defId]
        if(toon) { //ensure toon is in roster
            if(toon.combatType === 1) { // if character, must meet relic req of phase
                return toon.relic.currentTier >= relic
            } else { // if ship, must be seven star
                return toon.currentRarity === 7
            }
        }
        return false
    }

    maxPlacement(zone) {
        return this.placements[zone].length === 10
    }

    numAlreadyPlacedInZone(zone) {
        return this.placements[zone].length
    }

    numAlreadyAttemptedInZone(zone) {
        return this.attempted[zone].length
    }

    numAlreadyPlaced() {
        return this.numAlreadyPlacedInZone("LS") + this.numAlreadyPlacedInZone("Mix") + this.numAlreadyPlacedInZone("DS") + 
        this.numAlreadyAttemptedInZone("LS") + this.numAlreadyAttemptedInZone("Mix") + this.numAlreadyAttemptedInZone("DS")
    }

    toonAlreadyPlacedInZone(defId, zone) {
        return this.placements[zone].map(platoon => platoon.defId).includes(defId)
    }

    toonAlreadyAttemptedInZone(defId, zone) {
        return this.attempted[zone].map(platoon => platoon.defId).includes(defId)
    }

    toonAlreadyPlacedAnywhere(defId) {
        return this.toonAlreadyPlacedInZone(defId, "LS") || this.toonAlreadyPlacedInZone(defId, "Mix") || this.toonAlreadyPlacedInZone(defId, "DS") ||
        this.toonAlreadyAttemptedInZone(defId, "LS") || this.toonAlreadyAttemptedInZone(defId, "Mix") || this.toonAlreadyAttemptedInZone(defId, "DS")
    }

    assign(defId, zone) {
        this.placements[zone].push(defId)
    }

    reset() {
        this.placements = this._initializePlacements()
    }

    placementScore(defIdList, placementMap, requiredRelic) {
        let score = 0
        defIdList.forEach(defId => {
            placementMap[defId].forEach(platoon => {
                if (this.meetsRelicRequirement(defId, requiredRelic[platoon.phase])) {
                    ++score
                }
            })
        })
        return score
    }


    sort(other, defIdList, placementMap, requiredRelic) {
        let aNumPlaced = this.numAlreadyPlaced()
        let bNumPlaced = other.numAlreadyPlaced()
        let aPlacementScore = this.placementScore(defIdList, placementMap, requiredRelic)
        let bPlacementScore = other.placementScore(defIdList, placementMap, requiredRelic)
        // take the one with the lower number already placed
        // if numbers are equal, take the one with the least amount of toons that they could fill
        return aNumPlaced - bNumPlaced || aPlacementScore - bPlacementScore
    }

    toString() {
        return {
            "name": this.name
        }
    }
}
