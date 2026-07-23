export default class Zone {
    constructor(zoneId, platoons) {
        this.zoneId = zoneId
        this.platoons = platoons || []
        this.placementsMap = this._initPlacementMap()
    }

    _initPlacementMap() {
        let toonDefIds = [...new Set(this.platoons.map(platoon => platoon.defId))]
        let map = new Map()
        toonDefIds.forEach(defId => {
            map.set(defId, this.platoons.filter(platoon => platoon.defId === defId))
        })
        return map
    }

    numRequired(defId) {
        return this.placementsMap.get(defId).length || 0
    }

    toonsRequired() {
        return [...this.placementsMap.keys()]
    }
}