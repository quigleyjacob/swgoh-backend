import DB from './database/database.js'
import Comlink from './comlink.js'
import fs from 'fs'

const season = 'CHAMPIONSHIPS_GRAND_ARENA_GA2_EVENT_SEASON_52:O1713906000000'

const BattleOutcome = {
    0: "BattleOutcome_DEFAULT",
    1: "WIN",
    2: "LOSS",
    3: "RETREAT",
    4: "DRAW",
    5: "CLIENTSTOPPED"
  }

  const guilds = [
    'jrl9Q-_CRDGdMyNjTQH1rQ',
    'fJXYTxpsS9iZvGj2M1OUGw',
    'nNv53ssBQhaKue5zstelFQ',
    'YejwMXrlTSaPuZp4OUQaLA',
    '0HQfPaTtSPSNOiSCNII89Q',
    'DsTZ7vt6Tuy_rjehJDtE-g',
    '7KsGX9kTRqSzbXDcIqIGvg'
]

export async function getDefensesPlacedForGauntlet() {
    let writer = fs.createWriteStream('./defense.csv')
    writer.write('player,guild,round,leader,squad')

    let nonUpdatedPlayers = {}

    for(let guildId of guilds) {
        let nonupdatedNames = await getGacDefensesForGuild(writer, guildId)
        nonUpdatedPlayers[guildId] = nonupdatedNames
    }

    writer.end()
    return nonUpdatedPlayers
}

async function getGacDefensesForGuild(writer, guildId) {
    let guildData = await Comlink.getGuild(guildId)
    let guild = guildData.guild
    let guildName = guild.profile.name
    let nonUpdatedNames = []
    for(let guildMember of guild.member) {
        await new Promise(r => setTimeout(r, 100))
        let memberName = guildMember.playerName
        let playerId = guildMember.playerId
        let result = await getGacDefensesForPlayer(writer, playerId, memberName, guildName)
        // console.log(result)
        nonUpdatedNames.push(result)
    }
   
    nonUpdatedNames.filter(str => str !== '')
    return nonUpdatedNames
}

async function getGacDefensesForPlayer(writer, playerId, memberName, guildName) {
    let bracketResultsforPlayer
    try {
        bracketResultsforPlayer = await DB.getLatestBracketResultsFromPlayerId(playerId)
    } catch(err) {
        console.log(err)
        return memberName
    }
    if(!bracketResultsforPlayer.eventInstanceId.includes(season)) {
        return memberName
    }

    bracketResultsforPlayer.matchResult.forEach((match, matchIndex) => {
        match.defenseResult.forEach(battle => {
            let battleOutcome = battle.duelResult[0].battleOutcome
            let attackingLead = battle.duelResult[0].attackerUnit[0].definitionId.split(':')[0]
            let attackingTeam = battle.duelResult[0].attackerUnit.map(unit => unit.definitionId.split(':')[0]).join(';')
            let defendingLead = battle.duelResult[0].defenderUnit[0].definitionId.split(':')[0]
            let defendingTeam = battle.duelResult[0].defenderUnit.map(unit => unit.definitionId.split(':')[0]).join(';')
            writer.write(`${memberName},${guildName},${matchIndex},${attackingLead},${attackingTeam},${defendingLead},${defendingTeam},${BattleOutcome[battleOutcome]}\n`)
        })
    })
    return ''
}

export async function getGacHistoryForGauntlet() {

    let writer = fs.createWriteStream('./battles.csv')
    writer.write('player,guild,round,attackingLead,attackingTeam,defendingLead,defendingTeam,battleOutcome\n')

    let nonUpdatedPlayers = {}

    for(let guildId of guilds) {
        let nonupdatedNames = await getGacHistoryForGuild(writer, guildId)
        nonUpdatedPlayers[guildId] = nonupdatedNames
    }

    writer.end()
    return nonUpdatedPlayers

}

async function getGacHistoryForGuild(writer, guildId) {
    
    let guildData = await Comlink.getGuild(guildId)
    let guild = guildData.guild
    let guildName = guild.profile.name
    let nonUpdatedNames = []
    for(let guildMember of guild.member) {
        await new Promise(r => setTimeout(r, 100))
        let memberName = guildMember.playerName
        let playerId = guildMember.playerId
        let result = await getGacHistoryForPlayer(writer, playerId, memberName, guildName)
        nonUpdatedNames.push(result)
    }
   
    console.log(nonUpdatedNames)
    nonUpdatedNames.filter(str => str !== '')
    return nonUpdatedNames
}


async function getGacHistoryForPlayer(writer, playerId, name, guildName) {
    let bracketResultsforPlayer
    try {
        bracketResultsforPlayer = await DB.getLatestBracketResultsFromPlayerId(playerId)
    } catch(err) {
        console.log(err)
        return name
    }
    if(!bracketResultsforPlayer.eventInstanceId.includes(season)) {
        return name
    }

    bracketResultsforPlayer.matchResult.forEach((match, matchIndex) => {
        match.attackResult.forEach(battle => {
            let battleOutcome = battle.duelResult[0].battleOutcome
            let attackingLead = battle.duelResult[0].attackerUnit[0].definitionId.split(':')[0]
            let attackingTeam = battle.duelResult[0].attackerUnit.map(unit => unit.definitionId.split(':')[0]).join(';')
            let defendingLead =battle.duelResult[0].defenderUnit[0].definitionId.split(':')[0]
            let defendingTeam = battle.duelResult[0].defenderUnit.map(unit => unit.definitionId.split(':')[0]).join(';')
            writer.write(`${name},${guildName},${matchIndex},${attackingLead},${attackingTeam},${defendingLead},${defendingTeam},${BattleOutcome[battleOutcome]}\n`)
        })
    })

    return ''
}
