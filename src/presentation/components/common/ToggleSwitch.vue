<script setup>
defineProps({ modelValue: Boolean, label: String, disabled: Boolean })
defineEmits(['update:modelValue'])
</script>

<template>
  <label class="toggle">
    <input type="checkbox" :checked="modelValue" :disabled="disabled" @change="$emit('update:modelValue', $event.target.checked)" />
    <span>{{ label }}</span>
  </label>
</template>
