import { redisGet, redisPut } from "../lib/redis.js"
import xxhash from 'xxhash-wasm';

// Initialize the hasher (do this once in your app)
const { h64ToString } = await xxhash();


function generateLinkCacheKey(linkType, link) {
    return `link:${linkType}:${h64ToString(link)}`
}

export async function getShortenedLinks(baseUrl, links) {
    return Promise.all(links.map(async ({link, insightsLink, ...rest}) => {
        let key = generateLinkCacheKey('counter', link)
        let key2 = generateLinkCacheKey('insights', insightsLink)
        await redisPut(key, link, 60*60*24 )
        
        await redisPut(key2, insightsLink, 60*60*24 )
        return {
            link: `${baseUrl}/${key}`,
            insightsLink: `${baseUrl}/${key2}`,
            ...rest
        }
    }))
}