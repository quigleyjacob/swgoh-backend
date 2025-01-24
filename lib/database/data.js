import { localize } from "../../utils/aggregation.js"
import { connectToDatabase } from "../../utils/mongodb.js"
import { handleDBError } from "../../utils/error.js"
import { 
    defaultCategoryProjection,
    defaultSkillProjection,
    defaultUnitProjection,
    defaultPlayerPortraitProjection,
    defaultCurrencyProjection,
    defaultMaterialProjection,
    defaultEquipmentProjection,
    defaultDatacronSetProjection,
    defaultDatacronTemplateProjection,
    defaultDatacronAffixTemplateSetProjection,
    defaultBattleTargetingRuleProjection,
    defaultAbilityProjection 
} from "../../utils/projections.js"

class Data {

    async _get(collectionName, match = null, projection = null, localizedKey = null) {
        const { db } = await connectToDatabase()

        let aggregationArray = [
            match ? {$match: match} : null,
            localizedKey ? localize(localizedKey) : null,
            projection ? {$project: projection} : null
        ].flat().filter(element => element !== null)
        try {
            return await db.collection(collectionName).aggregate(aggregationArray).toArray()
        } catch(err) {
            throw handleDBError(err, collectionName, 'get')
        }
    }

    async _getOne(collectionName, match = null, projection = null) {
        const { db } = await connectToDatabase()
        try {
            return await db.collection(collectionName).findOne(match, {projection})
        } catch(err) {
            throw handleDBError(err, collectionName, 'get')
        }
    }

    async getActiveDatacronSets() {
        let now = Date.now().toString()
        return this._get('datacronSet', {expirationTimeMs : {$gt: now}}, defaultDatacronSetProjection, 'displayName')
    }

    async getDatacronTemplates(idList) {
        return this._get('datacronTemplate', {setId: {$in: idList}}, defaultDatacronTemplateProjection, null)
    }

    async getDatacronAffixTemplateSet(idList) {
        return this._get('datacronAffixTemplateSet', {id: {$in: idList}}, defaultDatacronAffixTemplateSetProjection, null)
    }

    async getBattleTargetingRule(idList) {
        return this._get('battleTargetingRule', {id: {$in: idList}}, defaultBattleTargetingRuleProjection, null)
    }

    async getUnits() {
        return this._get('units', null, defaultUnitProjection, 'nameKey')
    }

    async getUnitsMap() {
        let units = await this.getUnits()
        return units.reduce((obj, unit) => (obj[unit.baseId] = unit, obj), {})
    }

    async getSkills() {
        return this._get('skill', null, defaultSkillProjection, null)
    }

    async getCategoryList(idList = null) {
        let match = idList ? {id: {$in: idList}} : {visible: true}
        return this._get('category', match, defaultCategoryProjection, 'descKey')
    }

    async getAbilityList(idList) {
        return this._get('ability', {id: {$in: idList}}, defaultAbilityProjection, 'descKey')
    }

    // TODO: figure out how to aggregate this when refreshing player data
    async getPortrait(id) {
        return this._getOne('playerPortrait', {id: id}, defaultPlayerPortraitProjection)
    }

    async getCurrency() {
        return this._get('currency', null, defaultCurrencyProjection, 'nameKey')
    }

    async getMaterial() {
        return this._get('material', null, defaultMaterialProjection, 'nameKey')
    }

    async getEquipment() {
        return this._get('equipment', null, defaultEquipmentProjection, 'nameKey')
    }

    async getData(type) {
        return this._getOne('data', {type}, null, null)
    }

    async getPlatoons(tb, zones = [], excludedPlatoons = []) {
        const { db } = await connectToDatabase()

        const getBody = (zoneId) => {
            let arr = zoneId.split(':')
            let map = {}
            if(arr.length > 0) {
                map.alignment = arr[0]
            }
            if(arr.length > 1) {
                map.phase = Number(arr[1])
            }
            if(arr.length > 2) {
                map.operation = Number(arr[2])
            }
            if(arr.length > 3) {
                map.row = Number(arr[3])
            }
            if(arr.length > 4) {
                map.slot = Number(arr[4])
            }
            return map
        }

        let zonesQueryList = zones.map(zone => getBody(zone))

        let excludedPlatoonsQueryList = excludedPlatoons.map(platoon => getBody(platoon))

        let query = zones.length === 0
        ?
        {tb: tb}
        :
        excludedPlatoons.length === 0
        ?
        {tb: tb, $or:zonesQueryList}
        :
        {tb: tb, $or:zonesQueryList, $nor: excludedPlatoonsQueryList}

        let platoonData = await db.collection('platoons').find(query).toArray()
        return platoonData
    }

}

export default new Data()