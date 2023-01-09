
function checkContentType(response, expectedContentType) {
    let contentType = response.headers.get("content-type")
    return contentType && contentType.indexOf(expectedContentType) !== -1
}

export function isJSON(response) {
    return checkContentType(response, "application/json")
}