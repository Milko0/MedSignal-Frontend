// Shared Plotly look: transparent background, palette from tokens.css, hover tooltips, responsive.
export const COLORS = { teal: '#1b7c8c', coral: '#c0453a', amber: '#b7791f', green: '#2f855a', slate: '#8fa7ae', ink: '#17323b' }
export const SEQUENCE = [COLORS.teal, COLORS.coral, COLORS.slate, COLORS.amber, COLORS.green]

export const baseLayout = () => ({
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor: 'rgba(0,0,0,0)',
  font: { family: 'Inter, system-ui, sans-serif', size: 12, color: COLORS.ink },
  margin: { t: 16, r: 12, b: 36, l: 44 },
  colorway: SEQUENCE,
  hoverlabel: { bgcolor: '#17323b', font: { color: '#fff' } },
  xaxis: { gridcolor: '#e6eef0', zeroline: false },
  yaxis: { gridcolor: '#e6eef0', zeroline: false },
  legend: { orientation: 'h', y: -0.2 },
})
export const baseConfig = { responsive: true, displaylogo: false, displayModeBar: 'hover',
  modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d'] }
