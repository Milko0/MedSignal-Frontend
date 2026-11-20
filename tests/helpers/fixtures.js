// One realistic backend JSON object per DTO (MedSignal-Backend/app/application/dtos). Reused by mapper and store
// tests. Keep the field names in snake_case exactly as the API sends them.
export const DISCLAIMER_TEXT =
  'Adverse event reports are voluntary and unverified. They show a statistical signal, not proof that a drug caused a reaction.'

export const userResponse = { user_id: 'u-1f3a', username: 'p1_test_a', email: 'p1_test_a@example.com', role: 'user' }
export const tokenResponse = { access_token: 'jwt.token.value', token_type: 'bearer' }

export const drugSearchResult = {
  rxcui: '5640', name: 'ibuprofen', brand_names: ['Advil', 'Motrin'], matched: 'Advil', score: 0.93,
}

export const drug360 = {
  rxcui: '5640',
  name: 'ibuprofen',
  brand_names: ['Advil', 'Motrin'],
  atc_classes: [{ class_id: 'M01AE', name: 'Propionic acid derivatives' }],
  selected_dosage_form: 'TABLET',
  selected_route: 'ORAL',
  shortage: {
    status: 'CURRENT', packages_in_shortage: 3, packages_total: 41, dosage_forms: ['TABLET', 'SUSPENSION'],
    since: '2026-02-11', reasons: ['Increased demand'],
  },
  recalls: { class_i: 0, class_ii: 2, class_iii: 1, not_classified: 1, total: 4, linked_share: 0.62 },
  label: {
    available: true, product_types: ['HUMAN PRESCRIPTION DRUG LABEL'], effective_date: '2025-08-30',
    has_boxed_warning: true, description: 'Nonsteroidal anti-inflammatory drug.',
  },
  top_reactions: [{ reaction: 'Gastrointestinal haemorrhage', reports: 1204 }, { reaction: 'Nausea', reports: 980 }],
  is_followed: true,
  match_coverage: 0.87,
}

// A drug with no shortage record and no label: nothing is invented for the missing parts.
export const drug360NoShortage = {
  rxcui: '161', name: 'acetaminophen', top_reactions: [],
  shortage: { status: null }, recalls: {}, label: {},
}

export const trendPoint = { month: '2026-03', reaction: 'Nausea', reports: 87 }

export const labelGapsData = {
  label_available: true,
  comparable: true,
  note: null,
  gaps: [
    { reaction: 'Tinnitus', reports: 64, match_level: 'NONE', in_indications: false },
    { reaction: 'Back pain', reports: 31, match_level: 'PARTIAL', in_indications: true },
  ],
}

export const alternativesData = {
  target_dosage_form: 'TABLET',
  target_routes: ['ORAL'],
  items: [
    {
      match_type: 'SAME_INGREDIENT', rxcui: '310965', name: 'ibuprofen 200 MG Oral Tablet', dosage_form: 'TABLET',
      routes: ['ORAL'], recalls: 0, signal_profile: 'LOW', products_available: 12, rank: 1,
    },
    {
      match_type: 'SAME_CLASS', rxcui: '7258', name: 'naproxen', dosage_form: null,
      routes: [], recalls: 1, signal_profile: 'MODERATE', products_available: 8, rank: 2,
    },
  ],
}

export const signalRow = {
  rxcui: '5640', drug: 'ibuprofen', reaction: 'Gastrointestinal haemorrhage', quarter: '2026Q3', reports: 1204,
  a: 1204, b: 9800, c: 4100, d: 880000, prr: 4.87, ci_lower: 4.48, chi_square: 1609.4,
  is_signal: true, is_emerging: false, label_match: 'FULL', trend: [3.9, 4.1, 4.87],
}

// SignalList as it comes inside the envelope's `data`
export const signalList = {
  items: [signalRow], total: 41, page: 2, page_size: 10, total_pages: 5, quarter: '2026Q3', match_coverage: 0.87,
}
export const signalEnvelope = { data: signalList, meta: { disclaimer: DISCLAIMER_TEXT } }
export const labelGapsEnvelope = { data: labelGapsData, meta: { disclaimer: DISCLAIMER_TEXT } }

export const reportBrief = {
  report_id: '10234567', receive_date: '2026-07-14', serious: true, age_group: '65-74', sex: 'F', country: 'US',
  reactions: ['Gastrointestinal haemorrhage', 'Anaemia'], suspect_drugs: ['IBUPROFEN'],
}
export const signalReports = { items: [reportBrief], total: 1, page: 1, page_size: 10, total_pages: 1 }

export const statistics = {
  group_by: 'age_group', buckets: [{ group: '45-64', value: 30000 }, { group: '65-74', value: 23500 }],
}

export const followedDrug = { rxcui: '5640', name: 'ibuprofen', shortage_status: 'CURRENT', packages_in_shortage: 3 }
export const followedDrugNoShortage = { rxcui: '161', name: 'acetaminophen', shortage_status: null, packages_in_shortage: 0 }

export const alertItem = {
  alert_id: 'a-77', type: 'SHORTAGE', drug_rxcui: '5640', message: 'Ibuprofen tablets are now in shortage.',
  created_at: '2026-11-18T09:30:00Z',
}

export const alertSettingsDto = {
  new_signal: true, label_updated: false, shortage_changed: true, new_recall: true, min_reports: 25,
}
