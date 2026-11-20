<script setup>
// A labelled on/off switch (v-model). It is a real checkbox with role="switch", so assistive tech announces it as a
// switch and Space toggles it natively; Enter toggles it too (instead of submitting a surrounding form).
// `hint` is a second line under the label, read together with it.
import { useId } from 'vue'

defineProps({ modelValue: Boolean, label: String, hint: String, disabled: Boolean })
defineEmits(['update:modelValue'])

const uid = useId()
const toggleWithEnter = (e) => e.target.click()
</script>

<template>
  <label class="toggle" :class="{ off: disabled }">
    <input
      type="checkbox"
      role="switch"
      :checked="modelValue"
      :aria-checked="modelValue ? 'true' : 'false'"
      :aria-describedby="hint ? `${uid}-hint` : undefined"
      :disabled="disabled"
      @change="$emit('update:modelValue', $event.target.checked)"
      @keydown.enter.prevent="toggleWithEnter"
    />
    <span class="text">
      <span class="label">{{ label }}</span>
      <span v-if="hint" :id="`${uid}-hint`" class="hint">{{ hint }}</span>
    </span>
  </label>
</template>

<style scoped>
.toggle { display: inline-flex; align-items: flex-start; gap: .6rem; cursor: pointer; }
.toggle.off { cursor: not-allowed; opacity: .55; }
input { appearance: none; flex: none; position: relative; width: 2.3rem; height: 1.3rem; margin: .1rem 0 0; border-radius: 999px; background: var(--line); cursor: inherit; transition: background .15s; }
input::after { content: ''; position: absolute; top: .15rem; left: .15rem; width: 1rem; height: 1rem; border-radius: 50%; background: #fff; transition: transform .15s; }
input:checked { background: var(--teal); }
input:checked::after { transform: translateX(1rem); }
.text { display: flex; flex-direction: column; min-width: 0; }
.hint { font-size: .82rem; color: var(--muted); }
</style>
