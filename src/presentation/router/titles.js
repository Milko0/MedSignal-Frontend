export const APP_NAME = 'MedSignal'

// "Signals & statistics · MedSignal"; just "MedSignal" when there is no page title.
export const pageTitle = (title) => (title ? `${title} · ${APP_NAME}` : APP_NAME)

// After every navigation the tab shows the deepest matched route's meta.title.
export function installTitles(router, doc = document) {
  router.afterEach((to) => {
    doc.title = pageTitle(to.meta?.title)
  })
}
