import { bootApp } from './app/boot-app.js';
import { getSessionDbName } from './app/session-db-name.js';
import { createEventLog } from './engine/eventlog.js';

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  await bootApp({
    busDebug: true,
    eventLog: createEventLog({ dbName: getSessionDbName(window.location.pathname) })
  });
}
