<script setup>
// Brand half of Log in / Create account: what MedSignal does, shown as three rotating product moments
// (a rising signal, a shortage with alternatives, alerts). Decorative: the examples are illustrative.
// Rotates every 5 s, pauses while hovered or focused, and stays still for users who prefer reduced motion.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const SCENES = [
  { key: 'signal', tab: 'Spot signals early', caption: 'A reaction reported more and more often with a drug, and missing from its label.' },
  { key: 'shortage', tab: 'Get through shortages', caption: 'When a medicine runs short, ranked alternatives with the same form and route.' },
  { key: 'alerts', tab: 'Be told, not search', caption: 'Follow your medicines; we tell you when a signal, label, shortage or recall changes.' },
]
const DURATION = 5000

const active = ref(0)
const paused = ref(false)
const reduced = ref(false)
let timer = null

const scene = computed(() => SCENES[active.value])
function go(i) { active.value = (i + SCENES.length) % SCENES.length; restart() }
function restart() {
  clearInterval(timer)
  if (!reduced.value) timer = setInterval(() => { if (!paused.value) active.value = (active.value + 1) % SCENES.length }, DURATION)
}

onMounted(() => {
  reduced.value = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  restart()
})
onBeforeUnmount(() => clearInterval(timer))

// Scene 1: PRR of the pair over six quarters (illustrative), drawn as a line in a 300 x 120 box
const QUARTERS = ['Q2 25', 'Q3 25', 'Q4 25', 'Q1 26', 'Q2 26', 'Q3 26']
const PRR = [1.1, 1.3, 1.6, 2.4, 3.9, 5.2]
const points = PRR.map((v, i) => [14 + i * 78, 100 - v * 15])
const line = points.map((p) => p.join(',')).join(' ')
const area = `14,100 ${line} ${points.at(-1)[0]},100`
</script>

<template>
  <div class="showcase" @mouseenter="paused = true" @mouseleave="paused = false" @focusin="paused = true"
       @focusout="paused = false">
    <!-- chart paper + pulse line behind everything -->
    <svg class="backdrop" viewBox="0 0 800 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0H0V40" fill="none" stroke="rgb(255 255 255 / 6%)" stroke-width="1" />
        </pattern>
      </defs>
      <rect width="800" height="900" fill="url(#grid)" />
      <polyline class="pulse" fill="none" stroke="rgb(255 255 255 / 16%)" stroke-width="2"
                points="0,640 140,640 170,640 190,590 215,700 240,520 265,660 290,640 430,640 455,610 480,640 800,640" />
    </svg>

    <div class="content">
      <p class="kicker"><span class="mark" aria-hidden="true">
        <svg viewBox="0 0 24 24"><polyline points="2,13 7,13 10,6 14,19 17,11 22,11" /></svg>
      </span>MedSignal</p>
      <h1>Know what changes in the medicines you take</h1>
      <p class="lede">FDA side-effect reports, labels, shortages and recalls, turned into answers for one medicine at a time.</p>

      <div class="tabs" role="tablist" aria-label="What you can do with MedSignal">
        <button v-for="(s, i) in SCENES" :key="s.key" type="button" role="tab" class="tab"
                :class="{ on: i === active }" :aria-selected="i === active" @click="go(i)">
          <span class="tab-label">{{ s.tab }}</span>
          <span class="bar"><span class="fill" :class="{ run: i === active && !paused && !reduced }"
                                  :style="{ animationDuration: `${DURATION}ms` }" /></span>
        </button>
      </div>

      <div class="stage" aria-live="polite">
        <Transition name="scene" mode="out-in">
          <!-- 1. a rising signal -->
          <div v-if="scene.key === 'signal'" key="signal" class="card">
            <div class="row">
              <div>
                <p class="drug">Semaglutide</p>
                <p class="reaction">Optic ischaemic neuropathy</p>
              </div>
              <div class="chips">
                <span class="chip coral">Emerging</span>
                <span class="chip coral-line">Not in label</span>
              </div>
            </div>
            <svg class="chart" viewBox="0 0 420 116" aria-hidden="true">
              <line v-for="y in [25, 100]" :key="y" x1="14" :y1="y" x2="420" :y2="y" stroke="#e3e1da" />
              <line x1="14" y1="70" x2="420" y2="70" stroke="#a8362b" stroke-dasharray="4 4" opacity=".5" />
              <text x="418" y="64" text-anchor="end" class="axis">signal threshold</text>
              <polygon :points="area" fill="#a8362b" opacity=".08" />
              <polyline class="draw" :points="line" fill="none" stroke="#a8362b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
              <circle v-for="(p, i) in points" :key="i" :cx="p[0]" :cy="p[1]" :r="i === points.length - 1 ? 5 : 3" fill="#a8362b" />
              <text v-for="(q, i) in QUARTERS" :key="q" :x="14 + i * 78" y="114" :text-anchor="i === 0 ? 'start' : i === QUARTERS.length - 1 ? 'end' : 'middle'" class="axis">{{ q }}</text>
            </svg>
            <div class="facts">
              <p><b>37</b><span>reports this quarter</span></p>
              <p><b>5.2×</b><span>more often than with other drugs</span></p>
            </div>
          </div>

          <!-- 2. shortage and alternatives -->
          <div v-else-if="scene.key === 'shortage'" key="shortage" class="card">
            <div class="row">
              <div>
                <p class="drug">Amoxicillin oral suspension</p>
                <p class="reaction">Penicillins · oral</p>
              </div>
              <span class="chip amber">In shortage</span>
            </div>
            <p class="sub">Alternatives, same form and route</p>
            <ol class="alts">
              <li><span class="rank">1</span><span class="name">Amoxicillin (other manufacturer)</span><span class="chip green">Available</span></li>
              <li><span class="rank">2</span><span class="name">Amoxicillin / clavulanate</span><span class="chip green">Available</span></li>
              <li><span class="rank">3</span><span class="name">Penicillin V potassium</span><span class="chip slate">1 recall</span></li>
            </ol>
            <p class="foot">Ranked by recalls and safety profile</p>
          </div>

          <!-- 3. alerts -->
          <div v-else key="alerts" class="card alerts">
            <div class="row"><p class="drug">Your alerts</p><span class="bell" aria-hidden="true">3</span></div>
            <ul>
              <li class="alert" style="--d: 0ms"><span class="dot coral" /><div><b>Ibuprofen</b>: new signal<small>Acute kidney injury · today</small></div></li>
              <li class="alert" style="--d: 180ms"><span class="dot teal" /><div><b>Atorvastatin</b>: label updated<small>Adverse reactions section · 2 days ago</small></div></li>
              <li class="alert" style="--d: 360ms"><span class="dot slate" /><div><b>Metformin ER</b>: recall<small>Class II, nationwide · 5 days ago</small></div></li>
            </ul>
          </div>
        </Transition>
        <p class="caption">{{ scene.caption }}</p>
      </div>

      <dl class="stats">
        <div><dt>133k</dt><dd>FDA reports analysed</dd></div>
        <div><dt>6</dt><dd>quarters of history</dd></div>
        <div><dt>2,853</dt><dd>medicines covered</dd></div>
        <div><dt>Daily</dt><dd>shortage updates</dd></div>
      </dl>
    </div>
  </div>
</template>

<style scoped>
.showcase { position: relative; width: 100%; height: 100%; overflow: hidden; display: flex; }
.backdrop { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.pulse { stroke-dasharray: 1400; stroke-dashoffset: 1400; animation: pulse 6s linear infinite; }
@keyframes pulse { 0% { stroke-dashoffset: 1400; } 60%, 100% { stroke-dashoffset: 0; } }

.content { position: relative; width: 100%; max-width: 36rem; margin: auto; display: flex; flex-direction: column; gap: var(--s-3); }
.kicker { margin: 0; display: flex; align-items: center; gap: var(--s-2); font-size: var(--fs-sm); font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: rgb(255 255 255 / 75%); }
.mark { width: 1.5rem; height: 1.5rem; border-radius: 6px; background: rgb(255 255 255 / 14%); display: grid; place-items: center; }
.mark svg { width: 1rem; height: 1rem; fill: none; stroke: #fff; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
h1 { color: #fff; margin: 0; font-size: clamp(1.9rem, 2.9vw, 2.6rem); line-height: 1.1; letter-spacing: -.01em; }
.lede { margin: 0; color: rgb(255 255 255 / 80%); font-size: 1.0625rem; line-height: 1.5; max-width: 32rem; }

.tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--s-3); margin-top: var(--s-2); }
.tab { background: none; border: 0; padding: 0; text-align: left; color: rgb(255 255 255 / 60%); font: inherit; font-size: var(--fs-sm); font-weight: 500; cursor: pointer; display: flex; flex-direction: column; gap: var(--s-2); }
.tab.on, .tab:hover { color: #fff; }
.tab:focus-visible { outline: 2px solid #fff; outline-offset: 4px; border-radius: 2px; }
.bar { height: 3px; border-radius: 2px; background: rgb(255 255 255 / 22%); overflow: hidden; }
.fill { display: block; height: 100%; width: 0; background: #fff; }
.tab.on .fill { width: 100%; }
.fill.run { animation: progress linear forwards; width: 0; }
@keyframes progress { to { width: 100%; } }

.stage { min-height: 19.5rem; display: flex; flex-direction: column; gap: var(--s-3); }
.card { background: #fff; color: var(--ink); border-radius: 12px; padding: var(--s-4) var(--s-5); box-shadow: 0 1px 0 rgb(0 0 0 / 4%), 0 18px 40px rgb(10 20 60 / 28%); display: flex; flex-direction: column; gap: var(--s-3); }
.row { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--s-3); }
.drug { margin: 0; font-family: var(--font-display); font-size: 1.25rem; font-weight: 600; }
.reaction { margin: 2px 0 0; color: var(--ink-2); font-size: var(--fs-md); }
.chips { display: flex; flex-direction: column; align-items: flex-end; gap: var(--s-1); }
.chip { white-space: nowrap; border-radius: 999px; padding: .2rem .65rem; font-size: var(--fs-xs); font-weight: 600; }
.coral { background: var(--coral-soft); color: var(--coral); }
.coral-line { border: 1px solid var(--coral); color: var(--coral); }
.amber { background: var(--amber-soft); color: var(--amber); }
.green { background: var(--green-soft); color: var(--green); }
.slate { background: var(--slate-soft); color: var(--slate); }
.chart { width: 100%; height: auto; }
.axis { font-family: var(--font); font-size: 10px; fill: var(--muted); }
.draw { stroke-dasharray: 700; stroke-dashoffset: 700; animation: draw 1.4s ease-out .15s forwards; }
@keyframes draw { to { stroke-dashoffset: 0; } }
.facts { display: grid; grid-template-columns: 1fr 1fr; gap: var(--s-3); border-top: 1px solid var(--line); padding-top: var(--s-3); }
.facts p { margin: 0; display: flex; flex-direction: column; }
.facts b { font-family: var(--font-mono); font-size: 1.375rem; color: var(--coral); }
.facts span { font-size: var(--fs-sm); color: var(--ink-2); }

.sub { margin: 0; font-size: var(--fs-sm); font-weight: 600; color: var(--ink-2); }
.alts { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--s-2); }
.alts li { display: grid; grid-template-columns: 1.75rem 1fr auto; align-items: center; gap: var(--s-2); padding: .6rem .75rem; border: 1px solid var(--line); border-radius: 8px; font-size: var(--fs-md);
  opacity: 0; transform: translateY(6px); animation: rise .45s ease-out forwards; }
.alts li:nth-child(2) { animation-delay: .12s; }
.alts li:nth-child(3) { animation-delay: .24s; }
.rank { width: 1.5rem; height: 1.5rem; border-radius: 50%; background: var(--accent-soft); color: var(--accent); display: grid; place-items: center; font-size: var(--fs-xs); font-weight: 700; }
.foot { margin: 0; font-size: var(--fs-xs); color: var(--muted); }

.alerts ul { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--s-2); }
.alert { display: flex; gap: var(--s-3); align-items: flex-start; padding: .7rem .8rem; border-radius: 8px; background: var(--bg); font-size: var(--fs-md);
  opacity: 0; transform: translateX(16px); animation: slide .45s ease-out forwards; animation-delay: var(--d); }
.alert small { display: block; color: var(--muted); font-size: var(--fs-xs); margin-top: 2px; }
.alert .dot { width: .55rem; height: .55rem; border-radius: 50%; margin-top: .4rem; flex: none; }
.dot.coral { background: var(--coral); } .dot.teal { background: var(--teal); } .dot.slate { background: var(--slate); }
.bell { background: var(--coral); color: #fff; border-radius: 999px; min-width: 1.5rem; height: 1.5rem; display: grid; place-items: center; font-size: var(--fs-xs); font-weight: 700; }
@keyframes rise { to { opacity: 1; transform: none; } }
@keyframes slide { to { opacity: 1; transform: none; } }

.caption { margin: 0; color: rgb(255 255 255 / 85%); font-size: var(--fs-md); min-height: 2.6em; }

.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--s-3); margin: var(--s-2) 0 0; padding-top: var(--s-4); border-top: 1px solid rgb(255 255 255 / 20%); }
.stats div { display: flex; flex-direction: column; }
.stats dt { font-family: var(--font-mono); font-size: 1.375rem; font-weight: 600; color: #fff; }
.stats dd { margin: 0; font-size: var(--fs-xs); color: rgb(255 255 255 / 70%); }

.scene-enter-active, .scene-leave-active { transition: opacity .35s ease, transform .35s ease; }
.scene-enter-from { opacity: 0; transform: translateY(10px); }
.scene-leave-to { opacity: 0; transform: translateY(-10px); }

/* Phones: the form comes first, keep only the headline */
@media (max-width: 900px) {
  .tabs, .stage, .stats, .pulse { display: none; }
  h1 { font-size: var(--fs-xl); }
}

@media (prefers-reduced-motion: reduce) {
  .pulse, .draw, .alts li, .alert { animation: none; opacity: 1; transform: none; stroke-dashoffset: 0; }
  .scene-enter-active, .scene-leave-active { transition: none; }
}
</style>
