# domain

Models (JSDoc typedefs) and pure business rules. JavaScript, not TypeScript.

## Tools used

- Plain JavaScript + JSDoc `@typedef`
- Vitest for rule tests

## Rules

- Imports nothing (no Vue, no Axios, no Pinia).
- Rules are pure functions.

## Contents

| Item | Role |
|---|---|
| `models/` | User, Drug360, DrugSearchResult, TrendPoint, Signal, SignalList, LabelGaps, Alternatives, Alert, FollowedDrug, ReportBrief, Statistics, AlertSettings, Page typedefs (camelCase, mirror the backend DTOs) |
| `rules/signalSeverity.js` | PRR to severity tone, label match text (Listed / Partly listed / Not listed) |
| `rules/isEmerging.js` | FR-06 |
| `rules/shortageStatus.js` | `isInShortage`, `shortageTone`, `shortageLabel` for the backend enum (`CURRENT`, `TO_BE_DISCONTINUED`, `RESOLVED`, `null`) |
| `rules/alertTone.js` | Alert type (`SIGNAL`, `SHORTAGE`, `LABEL`, `RECALL`) to tone and label |
