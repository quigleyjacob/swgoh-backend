import Player from './Player.js'

export default class Guild {
    constructor(guildData) {
        this.name = guildData.profile.name
        this.roster = []
        guildData.roster.forEach(playerData => {
            this.roster.push(new Player(playerData))
        })
        this.unableToPlace = []
    }

    numAvailable(defId, phase) {
        return this.roster.filter(player => player.canPlaceAnywhere(defId, phase)).length
    }

    placements() {
        let placements = []
        this.roster.forEach(member => placements.push({name: member.name, allyCode: member.allyCode, playerId: member.playerId, placements: Object.fromEntries(member.placements)}))
        return placements
    }

    numToonPerRelic(defId, requiredRelic) {
        let map = new Map()
        requiredRelic.forEach(relic => {
            map.set(relic, this.roster.filter(player => player.meetsRelicRequirement(defId, relic)).length)
        })
        return map
    }

    reset() {
        this.roster.forEach(player => player.reset())
    }
}