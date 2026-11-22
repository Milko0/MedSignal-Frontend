<script setup>
// FR-13: which alerts the user receives and the minimum reports a signal needs. The switches edit a copy; nothing is
// sent until "Save settings" (fewer writes, and a clear "unsaved changes" state).
import { computed, onMounted, ref, useId } from 'vue'
import { useProfileStore } from '@/application/stores/useProfileStore'
import { ALERT_SWITCHES } from '@/domain/rules/alertSettings'
import { MIN_REPORT_OPTIONS } from '@/domain/rules/signalFilters'
import ToggleSwitch from '@/presentation/components/common/ToggleSwitch.vue'

const profile = useProfileStore()
const uid = useId()

const failure = ref('')
const savedNow = ref(false)

// Read once per session; the store keeps the answer, and the user's unsaved edits survive a retry.
onMounted(() => profile.load())

const settings = computed(() => profile.alertSettings)
// A value that is not one of the choices (set through the API) is still shown, so the select never lies.
const options = computed(() => {
  const current = settings.value?.minReports
  return current == null || MIN_REPORT_OPTIONS.includes(current)
    ? MIN_REPORT_OPTIONS
    : [...MIN_REPORT_OPTIONS, current].sort((a, b) => a - b)
})

const edit = () => { savedNow.value = false; failure.value = '' }

async function save() {
  edit()
  try {
    await profile.saveSettings()
    savedNow.value = true
  } catch (e) {
    failure.value = e?.message || 'Could not save the settings. Please try again.'
  }
}
function discard() { edit(); profile.discardSettings() }
</script>

<template>
  <section class="card" aria-labelledby="alerts-title">
    <h2 id="alerts-title">Alert settings</h2>
    <p class="muted">Choose which changes to the medicines you follow create an alert.</p>

    <p v-if="profile.loadError && !settings" class="error" role="alert">
      Could not load your alert settings.
      <button type="button" class="link" @click="profile.load({ force: true })">Retry</button>
    </p>
    <p v-else-if="!settings" class="muted" role="status">Loading…</p>

    <form v-else novalidate aria-label="Alert settings" @submit.prevent="save">
      <p v-if="failure" class="error banner" role="alert">{{ failure }}</p>

      <ul class="switches">
        <li v-for="s in ALERT_SWITCHES" :key="s.key">
          <ToggleSwitch v-model="settings[s.key]" :label="s.label" :hint="s.hint" @update:model-value="edit" />
        </li>
      </ul>

      <div class="min">
        <label :for="`${uid}-min`">Minimum reports for signals</label>
        <select :id="`${uid}-min`" v-model.number="settings.minReports" @change="edit">
          <option v-for="n in options" :key="n" :value="n">{{ n }}</option>
        </select>
        <p class="muted">A signal needs at least this many reports. It is also the default filter on the Signals page.</p>
      </div>

      <div class="actions">
        <button class="btn" :disabled="!profile.hasUnsavedChanges || profile.saving">{{ profile.saving ? 'Saving...' : 'Save settings' }}</button>
        <button v-if="profile.hasUnsavedChanges" type="button" class="btn outline" :disabled="profile.saving" @click="discard">Discard changes</button>
        <span v-if="profile.hasUnsavedChanges" class="unsaved" role="status">You have unsaved changes.</span>
        <span v-else-if="savedNow" class="ok" role="status">Settings saved.</span>
      </div>
    </form>
  </section>
</template>

<style scoped>
h2 { margin: 0; }
section > p { margin: var(--s-1) 0 0; font-size: var(--fs-md); color: var(--ink-2); }
form { margin-top: var(--s-4); }
.switches { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--s-3); }
.min { display: flex; flex-direction: column; gap: var(--s-1); margin-top: var(--s-4); }
.min p { margin: 0; font-size: var(--fs-md); color: var(--ink-2); }
label { font-size: var(--fs-sm); font-weight: 500; color: var(--ink-2); }
select { padding: .5rem .625rem; border: 1px solid var(--line-strong); border-radius: var(--radius-sm); font: inherit; font-size: var(--fs-md); background: var(--card); color: var(--ink); transition: border-color var(--t-fast), box-shadow var(--t-fast); max-width: 10rem; }
select:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.actions { display: flex; align-items: center; flex-wrap: wrap; gap: var(--s-2) var(--s-3); margin-top: var(--s-4); }
.btn:disabled { opacity: .55; cursor: not-allowed; }
.error { color: var(--coral); font-size: var(--fs-md); }
.banner { background: var(--coral-soft); color: var(--coral); border-radius: var(--radius-sm); padding: var(--s-2) var(--s-3); font-size: var(--fs-md); }
.unsaved { color: var(--amber); font-size: var(--fs-md); }
.ok { color: var(--green); font-size: var(--fs-md); }
.link { background: none; border: 0; padding: 0; color: var(--accent); font: inherit; text-decoration: underline; text-underline-offset: 2px; cursor: pointer; }
</style>
