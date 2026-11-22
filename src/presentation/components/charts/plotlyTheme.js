// Shared Plotly look: transparent background, hover tooltips, responsive. Plotly cannot read CSS variables, so these
// values mirror tokens.css (--ink, --ink-2, --line, --chart-*). Data series use neutral data hues on purpose: the
// semantic tones (coral signal, amber shortage) would make every chart look like a warning.
export const COLORS = {
  teal: '#3d5a73',     // primary data series (steel), kept under the old key so the charts need no change
  slate: '#8a96a0',
  coral: '#a8362b',
  amber: '#85570c',
  green: '#22693f',
  ink: '#1a2630',
  ink2: '#4a5862',
  grid: '#e3e1da',
  faint: '#d9d6cd',
}
export const SEQUENCE = ['#3d5a73', '#7a6a8c', '#5f8a6e', '#b39a6b', COLORS.slate]

export const baseLayout = () => ({
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor: 'rgba(0,0,0,0)',
  font: { family: "'IBM Plex Sans', system-ui, sans-serif", size: 12, color: COLORS.ink2 },
  margin: { t: 16, r: 12, b: 36, l: 44 },
  colorway: SEQUENCE,
  hoverlabel: { bgcolor: COLORS.ink, bordercolor: COLORS.ink, font: { family: "'IBM Plex Mono', ui-monospace, monospace", color: '#ffffff', size: 12 } },
  xaxis: { gridcolor: COLORS.grid, linecolor: COLORS.faint, zeroline: false, tickfont: { family: "'IBM Plex Mono', ui-monospace, monospace", size: 11 } },
  yaxis: { gridcolor: COLORS.grid, linecolor: COLORS.faint, zeroline: false, tickfont: { family: "'IBM Plex Mono', ui-monospace, monospace", size: 11 } },
  legend: { orientation: 'h', y: -0.2, font: { size: 12 } },
})
export const baseConfig = { responsive: true, displaylogo: false, displayModeBar: 'hover',
  modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d'] }
