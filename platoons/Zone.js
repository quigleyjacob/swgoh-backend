export default class Zone {
    constructor(alignment, phase, platoons) {
        this.alignment = alignment
        this.phase = phase
        this.platoons = platoons
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