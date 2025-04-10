import { connectToDatabase } from "../../utils/mongodb.js"
import Comlink from '../comlink.js'
import { powerRankingMultiplier } from "../../utils/constants.js"
import { getModScore } from "../../utils/mods.js"
import { zetaCount, omicronCount } from "../../utils/units.js"
import { handleDBError } from "../../utils/error.js"
import Data from './data.js'
import PlayerArena from "./player/playerArena.js"
import { defaultPlayerProjection, defaultGuildProjection, defaultPlayerArenaProjection } from "../../utils/projections.js"
import { getTags, handleNightTrooperTemplate, handlePOWTemplate, handleGreatMothersTemplate, handleBaylanSkollTemplate, handleHunterMercTemplate } from "../../utils/datacrons.js"
import decompress from 'decompress'
import { listToMap } from "../../utils/index.js"

class Refresh {

    async refreshMetaData() {
        const { db } = await connectToDatabase()
        let metaData = await Comlink.getMetaData()
        try {
            db.collection('data').updateOne({type: 'metaData'}, {$set: metaData}, {upsert: true})
        } catch(err) {
            throw handleDBError(err, 'metadata', 'set')
        }
    }

    async refreshPlayer(payload, projection = defaultPlayerProjection) {
        try {
            const { db } = await connectToDatabase()
            let comlinkResponse = await Comlink.getPlayerWithStats(payload)
            let skill = await Data.getSkills()
            let skillMap = skill.reduce((map, obj) => (map[obj.id] = obj, map), {})

            let allyCode = comlinkResponse.allyCode

            // determine the zeta and omi count for each toon for this player
            comlinkResponse.rosterUnit.forEach(unit => {
                unit.zetaCount = zetaCount(unit, skillMap)
                unit.omicronCount = omicronCount(unit, skillMap)
            })

            // adds baseId to each unit from the definitionId
            comlinkResponse.rosterUnit.forEach(unit => {
                let baseId = unit.definitionId.split(':')[0]
                unit.baseId = baseId
            })

            // updates latest refresh
            comlinkResponse.lastRefreshed = new Date()

            //computes total GP
            comlinkResponse.galacticPower = comlinkResponse.rosterUnit.reduce((a,b) => a + (b.gp || 0), 0)

            comlinkResponse.squadGalacticPower = comlinkResponse.rosterUnit.filter(unit => unit.relic).reduce((a,b) => a + (b.gp || 0), 0)

            //computes mod score
            comlinkResponse.modScore = getModScore(comlinkResponse)

            // removes mod data from each unit (very space heavy)
            comlinkResponse.rosterUnit = comlinkResponse.rosterUnit.map(({equippedStatMod, ...rest}) => rest)

            // compute GAC Power Score
            let leagueId = comlinkResponse?.playerRating?.playerRankStatus?.leagueId
            let divisionId = comlinkResponse?.playerRating?.playerRankStatus?.divisionId
            let skillRating = comlinkResponse?.playerRating?.playerSkillRating?.skillRating
            if(leagueId && divisionId && skillRating) {
                comlinkResponse.gacPowerScore = (powerRankingMultiplier[leagueId][divisionId]) * (skillRating) / (comlinkResponse.galacticPower / 1e5)
            } else {
                comlinkResponse.gacPowerScore = 0
            }

            let response = await db.collection('player').findOneAndUpdate({ allyCode: allyCode }, { $set: comlinkResponse }, { upsert: true, projection, returnDocument: 'after' })

            delete response.value.playerId

            return response.value
        } catch(err) {
            throw handleDBError(err, `Player ${JSON.stringify(payload)}`, 'update')
        }   
    }

    async refreshPlayers(array, projection, key) {
        return (await Promise.allSettled(array.map(async id => {
            return await this.refreshPlayer({[key]: id}, projection)
        })))
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value)
    }

    async refreshPlayerArena(payload, projection = defaultPlayerArenaProjection) {
        const { db } = await connectToDatabase()
        let response 
        try {
            let playerArena = await Comlink.getPlayerArena(payload)
            response = await db.collection('playerArena').findOneAndUpdate({ playerId: playerArena.playerId }, { $set: playerArena }, { upsert: true, projection: projection, returnDocument: 'after' })
        } catch(err) {
            throw handleDBError(err, 'playerArena', 'set')
        }

        return response.value
    }

    async refreshPlayerArenas(allyCodeArray, projection = defaultPlayerArenaProjection) {
        if(allyCodeArray.length === 0) {
            return allyCodeArray
        }
        try {
            const { db } = await connectToDatabase()

            let arenaList = (await Promise.allSettled(allyCodeArray.map(async allyCode => {
                return Comlink.getPlayerArena({allyCode})
            }))).filter(result => result.status === 'fulfilled')
            .map(result => result.value)

            let bulk = arenaList.map(elt => {
                return {
                    updateOne: {
                        filter: {allyCode: elt.allyCode},
                        update: {$set: elt},
                        upsert: true
                    }
                }
            })
            await db.collection('playerArena').bulkWrite(bulk)

            return arenaList
        } catch(err) {
            throw handleDBError(err, 'PlayerArena', 'refresh')
        }
    }

    async refreshGuild(guildId, projection = defaultGuildProjection) {
        const { db } = await connectToDatabase()
        let comlinkResponse = await Comlink.getGuild(guildId)

        try{
            let guildData = comlinkResponse.guild

            guildData.lastRefreshed = Date.now()
            // remove playerId, replace with allyCode
            let playerIds = guildData.member.map(obj => obj.playerId)
            let playerData = await PlayerArena.getPlayerArenas(playerIds, {allyCode: 1}, 'playerId')
            let idToAllyCode = playerData.reduce((map, obj) => (map[obj.playerId] = obj.allyCode, map), {})
            guildData.member.forEach(member => {
                member.allyCode = idToAllyCode[member.playerId] || ''
                // delete member.playerId
            })

            // remove playerId from raid scores
            guildData.recentRaidResult.forEach(raidResult => {
                raidResult.raidMember.forEach(raidMember => {
                    raidMember.allyCode = idToAllyCode[raidMember.playerId] || ''
                    // delete raidMember.playerId
                })
            })

            // add most recent raid score to player data
            if(guildData?.recentRaidResult?.length > 0) {
                let mostRecentRaid = guildData.recentRaidResult.reduce((max, curr) => {
                    return (max.endTime > curr.endTime) ? max : curr
                }, guildData.recentRaidResult[0] )
                let allyCodeToScore = mostRecentRaid.raidMember.reduce((map, raidMember) => {
                    map[raidMember.allyCode] = Number(raidMember?.memberProgress) || 0
                    return map
                }, {})
                guildData.member.forEach(member => {
                    member.raidScore = allyCodeToScore[member.allyCode]
                })
            }

            let response = await db.collection('guild').findOneAndUpdate({'profile.id': guildData.profile.id}, {$set: guildData}, {upsert: true, projection, returnDocument: 'after'})

            return response.value

        } catch(err) {
            throw handleDBError(err, 'Guild', 'add')
        }
    }

    async refreshGameData(latestGamedataVersion = undefined) {
        const { db } = await connectToDatabase()
        let gamedataVersion = latestGamedataVersion || (await Comlink.getMetaData())['latestGamedataVersion']
        let partitionMap = {
            '1': ['material', 'equipment', 'battleTargetingRule', 'playerPortrait', 'skill', 'category'],
            '2': ['territoryBattleDefinition', 'ability'],
            '3': ['units', 'relicTierDefinition'],
            '4': ['datacronSet', 'datacronTemplate', 'datacronAffixTemplateSet']
        }
        for await (const requestSegment of Object.keys(partitionMap)) {
            console.log(`Retrieving data segment ${requestSegment} from comlink`)
            let comlinkResponse = await Comlink.getGameData(Number(requestSegment), gamedataVersion)

            for await (const objectName of partitionMap[requestSegment]) {
                let objectData = comlinkResponse[objectName]
                // only store obtainable 7 star versions of the units
                if(objectName === 'units') {
                    objectData = objectData.filter(unit => unit.rarity === 7 && unit.obtainableTime === "0" && unit.obtainable)
                }
                let bulk = objectData.map(elt => {
                    return {
                        updateOne: {
                            filter: {id: elt.id},
                            update: {$set: elt},
                            upsert: true
                        }
                    }
                })
                console.log(`Refreshing ${objectName}`)
                await db.collection(objectName).bulkWrite(bulk)
            }
        }
        console.log('All data refreshed')
    }

    async refreshLocalization(latestLocalizationBundleVersion = undefined) {
        const { db } = await connectToDatabase()
        let result = await Comlink.getLocalization(latestLocalizationBundleVersion)
        let decodedBuffer = Buffer.from(result['localizationBundle'], 'base64')

        const regexList = [
            /^UNIT_.*_NAME(_?V[2-9])?\|.*/g,
            /^CATEGORY_.*\|.*/g,
            /^DATACRON_.*\|.*/g,
            /^ForceAlignment.*\|.*/g,
            /^MATERIAL.*\|.*/g,
            /^SCV.*\|.*/g,
            /^RM.*\|.*/g,
            /^COAXIUM.*\|.*/g,
            /^XP_ITEM.*\|.*/g,
            /^SHIP_XP_ITEM.*\|.*/g,
            /^SKILL.*\|.*/g,
            /^CREDIT.*\|.*/g,
            /^MOD.*\|.*/g,
            /^EQUIPMENT.*\|.*/g,
            /^Shared_Currency.*\|.*/g,
            /^SHARED_.*CURRENCY.*\|.*/g,
            /^BASICABILITY_.*\|.*/g,
            /^SPECIALABILITY.*\|.*/g
        ]
    
        await decompress(decodedBuffer)
        .then(async files => {
            let localizations = []
            await Promise.all(files.map(async file => {
                if(file.type === 'file' && file.path === 'Loc_ENG_US.txt') {
                    let collection = file.path.replace(/\.[^/.]+$/, "")
                    let fileLines = file.data.toString().split('\n')
                    localizations.push(collection)

                    let bulk = fileLines.reduce((filtered, line) => {
                        if(regexList.some(regex => line.match(regex))) {
                            let split = line.split('|')
                            let entry = {
                                key: split[0],
                                value: split[1]
                            }
                            filtered.push({
                                updateOne: {
                                    filter: {key: entry.key},
                                    update: {$set: entry},
                                    upsert: true
                                }
                            })
                        }
                        return filtered
                    }, [])
                    
                    await db.collection(collection).bulkWrite(bulk)
                }
            }))
        })
        console.log('Localization Refreshed')
    }

    async refreshActiveDatacrons() {
        let activeSets = await Data.getActiveDatacronSets()

        let setIds = activeSets.map(set => set.id)
        let activeTemplates = await Data.getDatacronTemplates(setIds)
        activeTemplates.forEach(activeTemplate => {
            switch (activeTemplate.id) {
                case 'datacron_set_15_padawanobiwan':
                    handlePOWTemplate(activeTemplates)
                    break
                case 'datacron_set_16_nighttrooper':
                    handleNightTrooperTemplate(activeTemplates)
                    break
                case 'datacron_set_17_greatmothers':
                    handleGreatMothersTemplate(activeTemplates)
                    break
                case 'datacron_set_18_baylanskoll':
                    handleBaylanSkollTemplate(activeTemplates)
                    break
                case 'datacron_set_20_hunters3':
                    handleHunterMercTemplate(activeTemplates)
                    break
                default:
                    break
            }
        })
        activeTemplates = activeTemplates.filter(template => template.referenceTemplateId === '' && !template.id.includes('focused'))
        let activeTemplatesMap = listToMap(activeTemplates, 'setId')

        let affixIdList = activeTemplates.map(template => template.tier.map(tier => tier.affixTemplateSetId)).flat().flat()
        let affixes = await Data.getDatacronAffixTemplateSet(affixIdList)
        let affixesMap = listToMap(affixes)

        let targetRuleIdList = affixes.map(affix => affix.affix.map(elt => elt.targetRule).flat()).flat().filter(str => str !== "")
        let targetRuleList = await Data.getBattleTargetingRule(targetRuleIdList)
        let targetRuleMap = listToMap(targetRuleList)

        let categoryIdList = targetRuleList.map(targetRule => targetRule.category.category.find(obj => !obj.exclude).categoryId)
        let categoryList = await Data.getCategoryList(categoryIdList)
        let categoryMap = listToMap(categoryList, 'id', 'descKey')

        let abilityIdList = affixes.map(affix => affix.affix.map(elt => elt.abilityId)).flat()
        let abilityList = await Data.getAbilityList(abilityIdList)
        let abilityMap = listToMap(abilityList, 'id', 'descKey')

        // return affixes
        let datacronData = activeSets.map(set => {
            let setId = set.id
            let activeTemplate = activeTemplatesMap[String(setId)]
            return {
                id: setId,
                name: set.displayName,
                icon: set.icon,
                tier: activeTemplate.tier.map((tier, index) => {
                    let type = index === 2 ? 'alignment' : index === 5 ? 'faction' : index === 8 ? 'character' : 'stat'

                    let stats, bonuses
                    if (type === 'stat') {
                        stats = tier.affixTemplateSetId.map(id => {
                            let affix = affixesMap[id].affix
                            return affix.map(elt => {
                                return {
                                    statType: elt.statType,
                                    setId: setId
                                }
                            })
                        })
                    } else {
                        bonuses = tier.affixTemplateSetId.map(id => {
                            let affix = affixesMap[id].affix

                            return affix.map(elt => {
                                let abilityId = elt.abilityId
                                let targetRule = elt.targetRule
                                let tag = getTags(elt)
                                let categoryId = targetRuleMap[targetRule].category.category.find(obj => !obj.exclude).categoryId
                                let categoryName = categoryMap[categoryId]
                                return {
                                    key: `${abilityId}:${targetRule}`,
                                    abilityId: abilityId,
                                    targetRule: targetRule,
                                    tag: tag,
                                    setId: setId,
                                    categoryId: categoryId,
                                    categoryName: categoryName,
                                    value: abilityMap[abilityId]?.replaceAll('{0}', categoryName)
                                }
                            })

                        })
                    }
                    return {
                        type,
                        stats,
                        bonuses
                    }
                })
            }
        })

        const { db } = await connectToDatabase()
        try {
            await db.collection('data').updateOne({type: 'datacron'}, {$set: {type: 'datacron', datacron: datacronData}}, {upsert: true})
            console.log('active datacron data updated')
        } catch(err) {
            throw handleDBError(err, 'data', 'update')
        }
    }
}



export default new Refresh()