import Zone from './Zone.js'

export default class Phase {
    constructor(zoneNumber, platoons) {
        this.zoneNumber = zoneNumber
        this.platoons = this._initializePlatoons(platoons)
        this.zones = this._zones(platoons)
        this.platoonUnits = this._platoonUnits(platoons)
    }

    _initializePlatoons(platoons) {
        return [...platoons["LS"], ...platoons["Mix"], ...platoons["DS"]]
    }

    _zones(platoons) {
        let map = new Map()
        map.set("LS", new Zone("LS", this.zoneNumber["LS"], platoons["LS"]))
        map.set("Mix", new Zone("Mix", this.zoneNumber["Mix"], platoons["Mix"]))
        map.set("DS", new Zone("DS", this.zoneNumber["DS"], platoons["DS"]))
        return map
    }

    _platoonUnits(platoons) {
        let map = new Map()
        map.set("LS", [...new Set(platoons["LS"].map(platoon => platoon.defId))])
        map.set("Mix", [...new Set(platoons["LS"].map(platoon => platoon.defId))])
        map.set("DS", [...new Set(platoons["LS"].map(platoon => platoon.defId))])
        return map
    }
}