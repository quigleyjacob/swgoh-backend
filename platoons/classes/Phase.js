import Zone from './Zone.js'

export default class Phase {
    constructor(zonesList, platoons) {
        this.zonesList = zonesList
        this.platoons = platoons
        this.platoonsPerZone = this._initializePlatoonsPerZone()
        this.zones = this._zones()
        this.platoonUnits = this._platoonUnits()
    }

    _initializePlatoonsPerZone() {
        return this.platoons.reduce((map, platoon) => {
            let zoneId = `${platoon.alignment}:${platoon.phase}`
            if(map[zoneId]) {
                map[zoneId].push(platoon)
            } else {
                map[zoneId] = [platoon]
            }
            return map
        }, {})
    }

    _zones() {
        let map = new Map()
        this.zonesList.forEach(zoneId => {
            map.set(zoneId, new Zone(zoneId, this.platoonsPerZone[zoneId]))
        })
        return map
    }

    _platoonUnits() {
        let map = new Map()
        this.zonesList.forEach(zoneId => {
            let platoonsPerZone = this.platoonsPerZone[zoneId] || []
            map.set(zoneId, [... new Set(platoonsPerZone.map(platoon => platoon.defId))])
        })
        return map
    }
}