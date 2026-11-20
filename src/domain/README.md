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
| `rules/pivotTrend.js` | Flat `[{month, reaction, reports}]` to chart series: top 3 reactions, calendar gaps filled with 0 |
| `rules/formatShortage.js` | `formatShortage` (tone, title, subtitle) and `formatDate` (`12 Sep 2026`) |
| `rules/alternatives.js` | Match type label, signal profile tone and label |
| `rules/percent.js` | `formatPercent(0.171)` = `17%`; below 1 never reads 100% |
| `rules/relativeTime.js` | `relativeTime(iso, now)`: "just now", "5 min ago", "2 h ago", "yesterday", "3 days ago", then the date |
