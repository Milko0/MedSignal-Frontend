// Composition root: the only place that wires concrete API adapters into application services.
import { configureHttp } from '@/infrastructure/http/httpClient'
import { tokenStorage } from '@/infrastructure/storage/tokenStorage'
import { authApi } from '@/infrastructure/api/authApi'
import { drugsApi } from '@/infrastructure/api/drugsApi'
import { shortagesApi } from '@/infrastructure/api/shortagesApi'
import { signalsApi } from '@/infrastructure/api/signalsApi'
import { statisticsApi } from '@/infrastructure/api/statisticsApi'
import { cabinetApi } from '@/infrastructure/api/cabinetApi'
import { profileApi } from '@/infrastructure/api/profileApi'
import { adminApi } from '@/infrastructure/api/adminApi'
import { createAuthService } from '@/application/services/authService'
import { createDrugService } from '@/application/services/drugService'
import { createSignalService } from '@/application/services/signalService'
import { createCabinetService } from '@/application/services/cabinetService'
import { createProfileService } from '@/application/services/profileService'
import { createAdminService } from '@/application/services/adminService'

// The client reads the token from storage. What a 401 means for the session (drop it, redirect to /login) needs the
// auth store and the router, so main.js plugs onUnauthorized in; until then a 401 changes nothing.
configureHttp({ getToken: tokenStorage.get })

export const services = {
  auth: createAuthService(authApi, profileApi, tokenStorage),
  drug: createDrugService(drugsApi, shortagesApi),
  signal: createSignalService(signalsApi, statisticsApi),
  cabinet: createCabinetService(cabinetApi),
  profile: createProfileService(profileApi),
  admin: createAdminService(adminApi),
}
