# charts

Interactive charts with Plotly.js (hover tooltips, zoom, responsive).

## Tools used

- plotly.js-dist-min (lazy-loaded: a separate ~4.6 MB chunk, fetched only when a chart mounts)

## Rules

- Every chart wraps `PlotlyChart.vue`; the shared look lives in `plotlyTheme.js`.
- Charts take plain data props, not store objects.

## Contents

| Item | Role |
|---|---|
| `PlotlyChart.vue` | Generic wrapper: Plotly.react, ResizeObserver, purge on unmount |
| `ReactionBars.vue` | Most reported reactions (horizontal bars) |
| `TrendChart.vue` | Monthly trend, unified hover |
| `DonutChart.vue` | Reports by sex |
| `AgeBarChart.vue` | Reports by age group |
