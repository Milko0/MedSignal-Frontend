<script setup>
// FR-22: administrator CRUD on adverse event reports (see AdminDocumentsPanel for the screen itself).
import { useAdminReportsStore } from '@/application/stores/useAdminCrudStore'
import { reportRow } from '@/domain/rules/admin'
import AdminDocumentsPanel from '@/presentation/components/admin/AdminDocumentsPanel.vue'

const store = useAdminReportsStore()
const columns = [
  { key: 'id', label: 'Report id', mono: true },
  { key: 'received', label: 'Received' },
  { key: 'quarter', label: 'Quarter' },
  { key: 'serious', label: 'Seriousness' },
  { key: 'drugs', label: 'Drugs' },
  { key: 'reactions', label: 'Reactions' },
  { key: 'country', label: 'Country' },
]
</script>

<template>
  <AdminDocumentsPanel :store="store" kind="report" id-field="report_id" id-label="Report id" title="Reports"
                       intro="FAERS adverse event reports, newest received first. Signals change after the next signal run of the report's quarter, not at once."
                       edit-hint="The report id identifies the record and cannot be changed when editing. An edit becomes the next version of the case."
                       :columns="columns" :row-of="reportRow" />
</template>
