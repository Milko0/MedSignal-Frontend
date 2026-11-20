// PageMeta (+ items) -> { items, total, page, pageSize, totalPages }
export function toPage(dto, mapItem) {
  return {
    items: (dto?.items ?? []).map(mapItem),
    total: dto?.total ?? 0,
    page: dto?.page ?? 1,
    pageSize: dto?.page_size ?? 10,
    totalPages: dto?.total_pages ?? 0,
  }
}

// DisclaimedResponse { data, meta: { disclaimer } } -> { data, disclaimer }
export function unwrap(envelope) {
  return { data: envelope?.data, disclaimer: envelope?.meta?.disclaimer ?? null }
}
