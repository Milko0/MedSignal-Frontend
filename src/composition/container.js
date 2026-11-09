// Composition root: the only place that wires concrete API adapters into application services.
import { authApi } from '@/infrastructure/api/authApi'
import { drugsApi } from '@/infrastructure/api/drugsApi'
import { signalsApi } from '@/infrastructure/api/signalsApi'
import { statisticsApi } from '@/infrastructure/api/statisticsApi'
import { cabinetApi } from '@/infrastructure/api/cabinetApi'
import { profileApi } from '@/infrastructure/api/profileApi'
import { createAuthService } from '@/application/services/authService'
import { createDrugService } from '@/application/services/drugService'
import { createSignalService } from '@/application/services/signalService'
import { createCabinetService } from '@/application/services/cabinetService'
import { createProfileService } from '@/application/services/profileService'

export const services = {
  auth: createAuthService(authApi),
  drug: createDrugService(drugsApi),
  signal: createSignalService(signalsApi, statisticsApi),
  cabinet: createCabinetService(cabinetApi),
  profile: createProfileService(profileApi),
}
