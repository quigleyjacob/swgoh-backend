export function listToMap(list, index='id', destination = null) {
    return list.reduce((map, obj) => {
        map[obj[index]] = destination ? obj[destination] : obj
        return map
    }, {})
}

export function maskFetchOptionsForLogging(options = {}) {
  const safeOptions = { ...options };

  if (!safeOptions.headers) return safeOptions;

  // Handle native Headers instance or plain object
  if (safeOptions.headers instanceof Headers) {
    const maskedHeaders = new Headers(safeOptions.headers);
    if (maskedHeaders.has('Authorization')) {
      maskedHeaders.set('Authorization', '[REDACTED]');
    }
    safeOptions.headers = maskedHeaders;
  } else {
    // Handle plain object headers (case-insensitive check)
    safeOptions.headers = Object.fromEntries(
      Object.entries(safeOptions.headers).map(([key, value]) => [
        key,
        key.toLowerCase() === 'authorization' ? '[REDACTED]' : value
      ])
    );
  }

  return JSON.stringify(safeOptions);
}