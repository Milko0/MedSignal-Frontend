const toSnake = (key) => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)

// camelCase params -> snake_case query string params. null / undefined / '' are dropped so an unset optional filter
// is never sent as an empty string; false and 0 are real values and are kept. Already-snake keys pass through.
export function toQuery(params = {}) {
  const query = {}
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') continue
    query[toSnake(key)] = value
  }
  return query
}
