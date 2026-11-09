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
| `models/` | Drug, Signal, Alternative, LabelGap, Alert, User typedefs |
| `rules/signalSeverity.js` | PRR to severity tone |
| `rules/isEmerging.js` | FR-06 |
| `rules/shortageStatus.js` | Shortage predicate |
