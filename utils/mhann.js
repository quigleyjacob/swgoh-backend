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

// Mapping for alignment to conflict
const alignmentToConflict = {
    'DS': '02',  // left
    'Mix': '03', // middle
    'LS': '01'   // right
}

// Mapping for bonus zones
const bonusZoneMap = {
    'Bonus:1': {
        phase: '03',
        conflict: '01',
        isBonusZone: true
    },
    'Bonus:2': {
        phase: '04',
        conflict: '03',
        isBonusZone: true
    }
}

// Mapping for operation (game 1-6) to platoonId (API 6-1)
const operationToPlatoon = {
    1: 6,
    2: 5,
    3: 4,
    4: 3,
    5: 2,
    6: 1
}

// Mapping for row (game 1-3) to squadId (API 01, 02, 03)
const rowToSquad = {
    3: '01', // bottom
    2: '02', // middle
    1: '03'  // top
}

/**
 * Convert quig placement format to mhann deployment format
 * @param {string} allyCode - Player ally code
 * @param {string} userDiscordId - Player Discord ID
 * @param {Object} placements - Quig placements object with keys like 'DS:1', 'Mix:1', 'LS:1', 'Bonus:1', 'Bonus:2'
 * @returns {Object} Mhann deployment payload
 */
export function convertQuigToMhannDeployment(allyCode, userDiscordId, placements) {
    const deployRequests = []
    
    Object.entries(placements).forEach(([zoneKey, units]) => {
        let zoneId
        
        // Check if this is a bonus zone
        if(bonusZoneMap[zoneKey]) {
            const bonusZone = bonusZoneMap[zoneKey]
            zoneId = `tb3_mixed_phase${bonusZone.phase}_conflict${bonusZone.conflict}_bonus_recon01`
        } else {
            // Standard zone - alignment:phase format
            const [alignment, phase] = zoneKey.split(':')
            const conflict = alignmentToConflict[alignment]
            zoneId = `tb3_mixed_phase${String(phase).padStart(2, '0')}_conflict${conflict}_recon01`
        }
        
        units.forEach(unit => {
            const platoonId = operationToPlatoon[unit.operation]
            const squadIds = [rowToSquad[unit.row]]
            
            deployRequests.push({
                zoneId: zoneId,
                platoonId: `tb3-platoon-${platoonId}`,
                squadId: [`tb3-squad-${squadIds[0]}`],
                baseId: unit.defId
            })
        })
    })
    
    return {
        payload: {
            eventName: 'TB3_MIXED',
            allyCode: allyCode,
            minimal: true,
            userDiscordId: userDiscordId,
            deployRequests: deployRequests
        }
    }
}