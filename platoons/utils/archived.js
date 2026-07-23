import { numToArray } from "./utils"
import Phase from "../classes/Phase.js"
import Strategy from "../classes/Strategy.js"
import Guild from "../classes/Guild.js"

function getPlatoonsFromMask(platoons, mask) {
    let ds = numToArray(mask & 63)
    let mix = numToArray((mask >> 6) & 63)
    let ls = numToArray((mask >> 12) & 63)
    let bonus = numToArray((mask >> 18) & 63)
    return  [...platoons["DS"].filter(it => ds.includes(it.operation)), ...platoons["Mix"].filter(it => mix.includes(it.operation)), ...platoons["LS"].filter(it => ls.includes(it.operation)), ...platoons["Bonus"].filter(it => bonus.includes(it.operation))]
}

// each operations parameter is a length 6 array for each operation checking for fill (1 means want to fill, 0 means don't want to fill)
// returns object, isValid boolean, missing array if invalid
async function canFillPlatoons(guildId, ls_phase, ls_operations, mix_phase, mix_operations, ds_phase, ds_operations) {
    let guildData = await (await fetch(`http://localhost:8080/api/guild/${guildId}?detailed=true&projection=platoons`)).json()
    let platoons = await (await fetch(`http://localhost:8080/api/platoon/ROTE/${ls_phase}/${mix_phase}/${ds_phase}`)).json()
    let phase = new Phase({"LS": ls_phase, "Mix": mix_phase, "DS": ds_phase}, platoons)
    let strat = new Strategy(phase, new Map().set("LS", ls_operations).set("Mix", mix_operations).set("DS", ds_operations), requiredRelic)
    let guild = new Guild(guildData)
    console.log(strat.isValid(guild))
}