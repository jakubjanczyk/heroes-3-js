import { bootApp } from './app/boot-app.js';

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  await bootApp({ busDebug: true });
}
