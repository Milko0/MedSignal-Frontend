<script setup>
// FR-07: is the reaction in the official label? FULL = Listed, PARTIAL = Partly listed, NONE = Not listed (a gap).
import StatusChip from '@/presentation/components/common/StatusChip.vue'
import { labelMatchLabel, labelMatchTone } from '@/domain/rules/signalSeverity'

defineProps({ labelMatch: { type: String, default: null } })   // 'FULL' | 'PARTIAL' | 'NONE'
</script>

<template>
  <StatusChip :status="labelMatch ?? 'unknown'" :label="labelMatchLabel(labelMatch)" :tone="labelMatchTone(labelMatch)" />
</template>
