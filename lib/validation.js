import { MyError } from "./error.js"

function checkContentType(response, expectedContentType) {
    let contentType = response.headers.get("content-type")
    return contentType && contentType.indexOf(expectedContentType) !== -1
}

export function isJSON(response) {
    return checkContentType(response, "application/json")
}

export async function validateResponse(response, errorMessage) {
    if(response.ok && isJSON(response)) {
        return await response.json()
    } else {
        throw new MyError(response.status, errorMessage, response)
    }
}

export async function processRequest(request, process) {
    try {
        let response = await process()
        request.send(response)
    } catch(err) {
        console.log(err)
        // console.log(await err.cause.text())
        // let message = err.cause ? await err.cause.text() : err.message
        // let response = err.cause ? await err.cause.json() : err.message
        let status = err.status || 500
        request.status(status).send(err.message)
    }
}