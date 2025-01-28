import { ObjectId } from "mongodb";
import { connectToDatabase } from "./utils/mongodb.js";

function generateSquadId(zoneId, index) {
    return `Auto-${zoneId}_squad${index}`
}

const squadsPerZone = {
    3: {
        KYBER: {
          '4zone_phase01_conflict01_duel01': 5,
          '4zone_phase01_conflict02_duel01': 5,
          '4zone_phase02_conflict02_duel01': 5,
          '4zone_phase02_conflict01_duel01': 3
        },
        AURODIUM: {
          '4zone_phase01_conflict01_duel01': 4,
          '4zone_phase01_conflict02_duel01': 4,
          '4zone_phase02_conflict02_duel01': 5,
          '4zone_phase02_conflict01_duel01': 2
        },
        CHROMIUM: {
          '4zone_phase01_conflict01_duel01': 3,
          '4zone_phase01_conflict02_duel01': 3,
          '4zone_phase02_conflict02_duel01': 4,
          '4zone_phase02_conflict01_duel01': 2
        },
        BRONZIUM: {
          '4zone_phase01_conflict01_duel01': 2,
          '4zone_phase01_conflict02_duel01': 2,
          '4zone_phase02_conflict02_duel01': 3,
          '4zone_phase02_conflict01_duel01': 1
        },
        CARBONITE: {
          '4zone_phase01_conflict01_duel01': 1,
          '4zone_phase01_conflict02_duel01': 1,
          '4zone_phase02_conflict02_duel01': 1,
          '4zone_phase02_conflict01_duel01': 1
        }
    },
    5: {
        KYBER: {
          '4zone_phase01_conflict01_duel01': 4,
          '4zone_phase01_conflict02_duel01': 4,
          '4zone_phase02_conflict02_duel01': 3,
          '4zone_phase02_conflict01_duel01': 3
        },
        AURODIUM: {
          '4zone_phase01_conflict01_duel01': 3,
          '4zone_phase01_conflict02_duel01': 3,
          '4zone_phase02_conflict02_duel01': 3,
          '4zone_phase02_conflict01_duel01': 2
        },
        CHROMIUM: {
          '4zone_phase01_conflict01_duel01': 3,
          '4zone_phase01_conflict02_duel01': 2,
          '4zone_phase02_conflict02_duel01': 2,
          '4zone_phase02_conflict01_duel01': 2
        },
        BRONZIUM: {
          '4zone_phase01_conflict01_duel01': 2,
          '4zone_phase01_conflict02_duel01': 2,
          '4zone_phase02_conflict02_duel01': 1,
          '4zone_phase02_conflict01_duel01': 1
        },
        CARBONITE: {
          '4zone_phase01_conflict01_duel01': 1,
          '4zone_phase01_conflict02_duel01': 1,
          '4zone_phase02_conflict02_duel01': 1,
          '4zone_phase02_conflict01_duel01': 1
        }
    }
  }

function upgradeGacData(gac) {
    if(gac.homeStatus !== undefined) {
        return gac
    }
    let oldZones = ['top', 'bottom', 'back', 'fleet']
    let newZones = [ '4zone_phase01_conflict01_duel01', '4zone_phase01_conflict02_duel01', '4zone_phase02_conflict02_duel01', '4zone_phase02_conflict01_duel01']

    let mode = gac.mode
    let league = gac.league
    let player = gac.player
    let opponent = gac.opponent
    let time = gac.time
    let _id = gac._id

    let battleLog = []
    let homeStatus = {}
    let awayStatus = {}
    let planStatus = {}

    for(const [index, oldZoneId] of oldZones.entries()) {
        let newZoneId = newZones[index]
        let numSquads = squadsPerZone?.[mode]?.[league]?.[newZoneId] || 0
        let array = Array.from({ length: numSquads }, (_, i) => i)
        for(const index of array) {
            let squadId = generateSquadId(newZoneId, index)

            // set home status
            let homeSquad = (gac.playerMap?.[oldZoneId]?.[index] || []).map(baseId => {
                return { baseId }
            })
            let homeDatacron = gac.playerDatacronMap?.[oldZoneId]?.[index]?.id || undefined
            homeStatus[squadId] = {squad: homeSquad, datacron: homeDatacron}

            // set away status
            let awaySquad = (gac.opponentMap?.[oldZoneId]?.[index] || []).map((baseId, unitIndex) => {
                let isAlive = !gac.killMap[oldZoneId][index][unitIndex]
                return { baseId, isAlive }
            })
            let awayDatacron = gac.opponentDatacronMap?.[oldZoneId]?.[index]?.id || undefined
            awayStatus[squadId] = {squad: awaySquad, datacron: awayDatacron}

            // set plan status
            let planSquad = (gac.planMap?.[oldZoneId]?.[index] || []).map(baseId => {
                return { baseId }
            }) || []
            let planDatacron = gac.planDatacronMap?.[oldZoneId]?.[index]?.id || undefined
            planStatus[squadId] = {squad: planSquad, datacron: planDatacron}
        }
    }
    for (const log of gac.battleLog) {
        let attackSquad = log.attackTeam.map((baseId) => {
            return {baseId}
        })
        let attackDatacron = log.attackDatacron?.id || undefined

        let defenseSquad = log.defenseTeam.map((baseId, index) => {
            return {baseId, isAlive: !log.killList[index]}
        })
        let defenseDatacron = log.defenseDatacron?.id || undefined

        let newLog = {
            attackTeam: {squad: attackSquad, datacron: attackDatacron},
            defenseTeam: {squad: defenseSquad, datacron: defenseDatacron},
            result: log.result,
            banner: log.banner,
            comment: log.comment,
            isToon: log.isToon
        }
        battleLog.push(newLog)
    }

    return {
        _id,
        player,
        opponent,
        mode,
        league,
        battleLog,
        homeStatus,
        awayStatus,
        planStatus,
        time
    }

}

async function upgradeGAC() {
    const { db } = await connectToDatabase()

    let idArray = await db.collection('gac').find({}, {projection: {_id: 1}}).toArray()

    for(const {_id} of idArray) {
        // console.log(_id)
        let data = await db.collection('gac').findOne({_id})
        if(data.homeStatus) {
            // console.log('\talready upgraded, just removing old data')
            await db.collection('gac').updateOne({_id}, {$unset: {playerMap: 1, opponentMap: 1, killMap: 1, playerDatacronMap: 1, opponentDatacronMap: 1, planMap: 1, planDatacronMap: 1, squadsPerZone: 1}})
            continue
        }
        // console.log('\tNeed to upgrade')
        // console.log(data)
        let upgraded = upgradeGacData(data)
        // console.log('\n')

        await db.collection('gac').updateOne({_id}, {$set: upgraded})
        await db.collection('gac').updateOne({_id}, {$unset: {playerMap: 1, opponentMap: 1, killMap: 1, playerDatacronMap: 1, opponentDatacronMap: 1, planMap: 1, planDatacronMap: 1, squadsPerZone: 1}})
    }
    console.log('gac done')
}
upgradeGAC()


function upgradeSquadData(squadData) {
  if(squadData.tags !== undefined) {
    return squadData
  }

  let _id = squadData._id
  let combatType = squadData.combatType
  let allyCode = squadData.allyCode
  let squad = squadData.squad

  let tags = []
  if(squadData.isFor3) {
    tags.push('gac3')
  }
  if(squadData.isFor5) {
    tags.push('gac5')
  }

  return {
    _id,
    allyCode,
    combatType,
    squad,
    tags
  }
}

async function upgradeSquad() {
  const { db } = await connectToDatabase()

  let idArray = await db.collection('squad').find({}, {projection: {_id: 1}}).toArray()

  for(const {_id} of idArray) {
      // console.log(_id)
      let data = await db.collection('squad').findOne({_id})
      if(data.tags) {
          // console.log('\talready upgraded, just removing old data')
          await db.collection('squad').updateOne({_id}, {$unset: {isFor3: 1, isFor5: 1}})
          continue
      }
      // console.log('\tNeed to upgrade')
      // console.log(data)
      let upgraded = upgradeSquadData(data)
      // console.log('\n')

      await db.collection('squad').updateOne({_id}, {$set: upgraded})
      await db.collection('squad').updateOne({_id}, {$unset: {isFor3: 1, isFor5: 1}})
  }
  console.log('squad done')
}
upgradeSquad()

function upgradeRoleData(roleData) {
  if(roleData.roleId) {
    return roleData
  }
  let _id = roleData._id
  let roleId = roleData.role_id
  let charId = roleData.char_id
  let serverId = roleData.server_id
  let guildId = roleData.guild_id

  return {
    _id,
    roleId,
    charId,
    serverId,
    guildId
  }
}

async function upgradeRole() {
  const { db } = await connectToDatabase()

  let idArray = await db.collection('discord_role').find({}, {projection: {_id: 1}}).toArray()

  for(const {_id} of idArray) {
      // console.log(_id)
      let data = await db.collection('discord_role').findOne({_id})
      if(data.roleId) {
          // console.log('\talready upgraded, just removing old data')
          await db.collection('discord_role').updateOne({_id}, {$unset: {guild_id: 1, role_id: 1, char_id: 1, server_id: 1}})
          continue
      }
      // console.log('\tNeed to upgrade')
      // console.log(data)
      let upgraded = upgradeRoleData(data)
      // console.log('\n')

      await db.collection('discord_role').updateOne({_id}, {$set: upgraded})
      await db.collection('discord_role').updateOne({_id}, {$unset: {guild_id: 1, role_id: 1, char_id: 1, server_id: 1}})
  }
  console.log('role done')
}
upgradeRole()
