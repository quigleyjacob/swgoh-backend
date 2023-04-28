import fetch from 'node-fetch'
import fs from 'fs'

export async function getCurrentGAC() {
    return await fetch("https://api.hotutils.com/Production/gac/get", {
        "headers": {
            "accept": "*/*",
            "accept-language": "en-US,en;q=0.9",
            "apiuserid": "898a36a3-948a-4a8a-9798-7a1552b042a8",
            "content-type": "application/json",
            "sec-ch-ua": "\"Not?A_Brand\";v=\"8\", \"Chromium\";v=\"108\", \"Google Chrome\";v=\"108\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-site",
            "Referer": "https://hotutils.com/",
            "Referrer-Policy": "strict-origin-when-cross-origin"
        },
        "body": "{\"sessionId\":\"4bd70a50-eb97-4210-9aec-02ffd0c3c1f4\",\"refresh\":false,\"tournamentEventId\":null,\"currentMatchId\":null}",
        "method": "POST"
    })
    .then(res => res.json())
}

export async function test() {
    let response = await fetch("https://api.hotutils.com/Production/setting/player/get", {
        "headers": {
          "accept": "*/*",
          "accept-language": "en-US,en;q=0.9",
          "apiuserid": "898a36a3-948a-4a8a-9798-7a1552b042a8",
          "content-type": "application/json",
          "sec-ch-ua": "\"Not?A_Brand\";v=\"8\", \"Chromium\";v=\"108\", \"Google Chrome\";v=\"108\"",
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": "\"Windows\"",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site"
        },
        "referrer": "https://hotutils.com/",
        "referrerPolicy": "strict-origin-when-cross-origin",
        "body": "{\"sessionId\":\"81434390-2b73-411e-9da0-9702a7de0357\",\"settingId\":\"theme\"}",
        "method": "POST"
      })
      .then(res => res.json())
      console.log(response)
      return response
}

//Deprecated, no longer storing images in Mongo
export async function getImage(thumbnail) {
    return await fetch(`https://game-assets.swgoh.gg/${thumbnail}.png`).then(res => {
        let contentType = res.headers.get('content-type')
        if(contentType && contentType.indexOf('image/png') !== -1) {
            return res.blob()
        } else {
            throw `Cannot find image with the provided thumbnail [${thumbnail}]`
        }
    })
    .then(res => res.arrayBuffer())
    .then(res => Buffer.from(res))
    .then(res => res.toString('base64'))
    .catch(err => {
        console.log(err)
    })    
}
