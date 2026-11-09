// API JSON (snake_case) -> domain model (camelCase)
export function toDrug(dto) {
  return {
    rxcui: dto.rxcui,
    name: dto.name,
    description: dto.description ?? '',
    drugClass: dto.drug_class,
    dosageForm: dto.dosage_form,
    shortage: { status: dto.shortage?.status ?? 'None', since: dto.shortage?.since, expectedReturn: dto.shortage?.expected_return },
    recalls: { classI: dto.recalls?.class_i ?? 0, classII: dto.recalls?.class_ii ?? 0, classIII: dto.recalls?.class_iii ?? 0 },
    label: { effectiveDate: dto.label?.effective_date, hasBoxedWarning: !!dto.label?.has_boxed_warning },
    topReactions: dto.top_reactions ?? [],
    topSignals: dto.top_signals ?? [],
    isFollowed: !!dto.is_followed,
    disclaimer: dto.meta?.disclaimer,
  }
}
