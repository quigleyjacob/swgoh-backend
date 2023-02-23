import { load } from "cheerio"
import fetch from "node-fetch"

export async function getLatestGacNumber(req, res) {
    let response = await fetch('https://swgoh.gg/p/134232169/gac-history/', {method: 'GET'})
    if(response.ok) {
        const $ = load(await response.text())
        let latest = $('.content-container-primary .list-group .list-group-item .dropdown-menu li a').first().attr('href')?.replace('?gac=', '')
        res.send(latest)
    } else {
        res.status(404).send('Unable to get latest GAC number.')
    }
}