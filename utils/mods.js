export function getModScore(account) {
    let speeds = account.rosterUnit.reduce((obj, unit) => {
        let newSpeeds = speedModsPerToon(unit)
        obj.fifteen += newSpeeds.fifteen
        obj.twenty += newSpeeds.twenty
        obj.twentyFive += newSpeeds.twentyFive
        return obj

    }, {fifteen: 0, twenty: 0, twentyFive: 0})
    return (speeds.twentyFive * 1.6 + speeds.twenty + speeds.fifteen * 0.8) / (account.squadGalacticPower / 1e5)
}

function speedModsPerToon(unit) {
    let obj = {
        fifteen: 0,
        twenty: 0,
        twentyFive: 0
    }
    unit.equippedStatMod.forEach(mod => {
        if(mod.primaryStat.stat.unitStatId !== 5) {
            mod.secondaryStat.forEach(secondary => {
                if(secondary.stat.unitStatId === 5) {
                    let speed = secondary.stat.statValueDecimal / 1e4
                    if(speed >= 25) {
                        obj.twentyFive += 1
                    } else if(speed >= 20) {
                        obj.twenty += 1
                    } else if (speed >= 15) {
                        obj.fifteen += 1
                    }
                }
            })
        }
    })
    return obj
}