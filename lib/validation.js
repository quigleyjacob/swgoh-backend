import { MyError } from "./error.js"

function checkContentType(response, expectedContentType) {
    let contentType = response.headers.get("content-type")
    return contentType && contentType.indexOf(expectedContentType) !== -1
}

export function isJSON(response) {
    return checkContentType(response, "application/json")
}

export function isOctet(response) {
    return checkContentType(response, "binary/octet-stream")
}

export async function validateMhannResponse(response, errorMessage, successFieldName) {
    let responseBody = await validateResponse(response, errorMessage)

    if(responseBody.code === 0) {
        return responseBody[successFieldName]
    }

    let error = new MyError(responseBody.code, responseBody.message, response)
    throw error
}

export async function validateResponse(response, errorMessage) {
    if(response.ok) {
        if(isJSON(response)) {
            return await response.json()
        }
        if(isOctet(response)) {
            return JSON.parse(await response.text())
        }
    }
    let error = new MyError(response.status, errorMessage, response)
    throw error
}

export async function processRequest(request, process) {
    try {
        let response = await process()
        request.send(response)
    } catch(err) {
        console.log(err)
        let status = err.status || 500
        request.status(status).send(err.message)
    }
}