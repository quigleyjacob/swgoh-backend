export function listToMap(list, index='id', destination = null) {
    return list.reduce((map, obj) => {
        map[obj[index]] = destination ? obj[destination] : obj
        return map
    }, {})
}