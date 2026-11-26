// Pure rules of the admin screens (FR-19 to FR-27). No Vue, no HTTP.

// The admin lists answer a plain array with no total, so "is there another page?" can only be guessed: a full page
// means maybe, a short one means no. (An exact multiple of the page size shows one empty last page: acceptable.)
export const hasNextPage = (rows, pageSize) => Array.isArray(rows) && rows.length >= pageSize
