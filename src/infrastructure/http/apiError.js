// One error type for every failed request, so stores never inspect Axios errors.
//   status      HTTP status, 0 = no response (network down, timeout)
//   message     text safe to show to the user
//   fieldErrors { [field]: message } from FastAPI 422 validation errors, {} otherwise
export class ApiError extends Error {
  constructor({ status = 0, message = 'Something went wrong', fieldErrors = {} } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

const NETWORK_MESSAGE = 'Cannot reach the server. Check your connection and try again.'

// FastAPI bodies: { detail: "text" } for domain errors, { detail: [{ loc, msg, type }] } for 422.
export function toApiError(error) {
  const response = error?.response
  if (!response) return new ApiError({ status: 0, message: NETWORK_MESSAGE })

  const status = response.status
  const detail = response.data?.detail

  if (typeof detail === 'string' && detail) return new ApiError({ status, message: detail })

  if (Array.isArray(detail) && detail.length) {
    const fieldErrors = {}
    for (const item of detail) {
      const field = Array.isArray(item?.loc) ? item.loc.at(-1) : null
      if (field !== null && field !== undefined && item?.msg && !(field in fieldErrors)) fieldErrors[field] = item.msg
    }
    const message = detail.find((d) => d?.msg)?.msg ?? `Request failed (${status})`
    return new ApiError({ status, message, fieldErrors })
  }

  return new ApiError({ status, message: `Request failed (${status})` })
}
