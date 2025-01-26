import fetch from 'node-fetch'
import { validateResponse } from './validation.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from "url"

export async function getCurrentGAC(sessionId) {
    // const __filename = fileURLToPath(import.meta.url);
    // const __dirname = path.dirname(__filename);
    // return JSON.parse(fs.readFileSync(path.resolve(__dirname, '../mockData/gacBoard.json'), 'utf8'))
    let body = {
        sessionId: sessionId,
        refresh: true
    }
    let response = await fetch("https://api.hotutils.com/Production/gac/get", {
        headers: {
            "apiuserid": "898a36a3-948a-4a8a-9798-7a1552b042a8",
            "Content-type": "application/json"
        },
        body: JSON.stringify(body),
        method: "POST"
    })
    return validateResponse(response, 'Unable to get current GAC board.')
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
