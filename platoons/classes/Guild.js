import Player from './Player.js'

export default class Guild {
    constructor(guildData, zones, placements=undefined) {
        this.name = guildData.profile.name
        this.roster = []
        if(placements === undefined) {
            guildData.roster.forEach(playerData => {
                this.roster.push(new Player(playerData, zones))
            })
        } else {
            this.roster = placements.map(placement => {
                return new Player(guildData.rosterMap[placement.allyCode], zones, placement.placements)
            })
        }
        this.unableToPlace = []
    }

    numAvailable(defId, phase) {
        return this.roster.filter(player => player.canPlaceAnywhere(defId, phase)).length
    }

    placements() {
        let placements = []
        this.roster.forEach(member => placements.push({name: member.name, allyCode: member.allyCode, placements: member.placements}))
        return placements
    }

    numToonPerRelic(defId, operation = undefined) {
        let map = new Map()
        let relics = [7, 8, 9, 10, 11]
        relics.forEach(relic => {
            map.set(relic, this.roster.filter(player => player.canPlaceAnywhere(defId,relic, operation)).length)
        })
        return map
    }

    reset() {
        this.roster.forEach(player => player.reset())
    }
}