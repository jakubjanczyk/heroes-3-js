const DEFAULT_SESSION_DB_NAME = 'heroes-3-js';

export function getSessionDbName(pathname) {
  const previewScope = /\/pr-preview\/[^/]+/.exec(pathname ?? '')?.[0];
  return previewScope ? `${DEFAULT_SESSION_DB_NAME}${previewScope}` : DEFAULT_SESSION_DB_NAME;
}
