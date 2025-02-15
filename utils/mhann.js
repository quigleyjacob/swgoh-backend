import crypto from 'crypto';

export function getMhannHeaders(method, payload, endpoint, apiKey) {
    return { 
        'Content-Type': 'application/json',
        'x-discord-id': '593451293352132625',
        ...generateHMAC(method, payload, endpoint, apiKey)
    }
}

function generateHMAC(method, payload, endpoint, apiKey) {
    // Generate Unix epoch time in milliseconds
    const timestamp = Date.now();

    // Create a base HMAC object using SHA256 algorithm
    const hmac = crypto.createHmac('sha256', apiKey);

    // Add the request timestamp to the HMAC object
    hmac.update(timestamp.toString());

    // Add the HTTP method (in upper case) to the HMAC object
    hmac.update(method.toUpperCase());

    // Add the API endpoint URI (in lower case) to the HMAC object
    hmac.update(endpoint.toLowerCase());

    // Create a serialized string from the payload JSON
    const payloadString = JSON.stringify(payload);

    // Generate MD5 hash of the payload string
    const payloadHash = crypto
    .createHash('md5')
    .update(payloadString)
    .digest('hex');

    // Add the payload hash to the HMAC object
    hmac.update(payloadHash);

    // Calculate the HMAC signature
    const HMACSignature = hmac.digest('hex');

    // Return the HMAC signature and timestamp
    return {'x-timestamp': timestamp, Authorization: HMACSignature};
}