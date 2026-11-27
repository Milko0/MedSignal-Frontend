import { resetAdminCrudStores } from '@/application/stores/useAdminCrudStore'
import { useAdminTermsStore } from '@/application/stores/useAdminTermsStore'
import { useAdminIngestionStore } from '@/application/stores/useAdminIngestionStore'

// Everything the admin screens keep in memory: dropped when the session ends (logout, expired token, deleted account),
// so the next person to sign in on this device never sees the previous admin's lists.
export function resetAdminStores() {
  resetAdminCrudStores()
  useAdminTermsStore().reset()
  useAdminIngestionStore().reset()
}
