// Bumped when saved event logs stop replaying correctly; old saves stay behind in the old database.
// v2: movement points moved to Heroes 3 terrain costs (1500 a day).
const DEFAULT_SESSION_DB_NAME = 'heroes-3-js-v2'

export function getSessionDbName(pathname) {
  const previewScope = /\/pr-preview\/[^/]+/.exec(pathname ?? '')?.[0]
  return previewScope ? `${DEFAULT_SESSION_DB_NAME}${previewScope}` : DEFAULT_SESSION_DB_NAME
}
