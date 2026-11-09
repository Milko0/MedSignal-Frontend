<script setup>
defineProps({ modelValue: Boolean, label: String })
defineEmits(['update:modelValue'])
</script>

<template>
  <label class="toggle">
    <input type="checkbox" :checked="modelValue" @change="$emit('update:modelValue', $event.target.checked)" />
    <span>{{ label }}</span>
  </label>
</template>
