<script setup>
// FR-23: administrator CRUD on drug labels (see AdminDocumentsPanel for the screen itself).
import { useAdminLabelsStore } from '@/application/stores/useAdminCrudStore'
import { labelRow } from '@/domain/rules/admin'
import AdminDocumentsPanel from '@/presentation/components/admin/AdminDocumentsPanel.vue'

const store = useAdminLabelsStore()
const columns = [
  { key: 'id', label: 'Label set id', mono: true },
  { key: 'version', label: 'Version' },
  { key: 'type', label: 'Type' },
  { key: 'effective', label: 'Effective' },
  { key: 'boxed', label: 'Boxed warning' },
  { key: 'ingredients', label: 'Ingredients' },
]
</script>

<template>
  <AdminDocumentsPanel :store="store" kind="label" id-field="set_id" id-label="Label set id" title="Labels"
                       intro="Official drug labels (SPL), ordered by set id. The text sections are what label gaps are checked against."
                       edit-hint="The set id identifies the record and cannot be changed when editing. Sections are plain text."
                       :columns="columns" :row-of="labelRow" />
</template>
