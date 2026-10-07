import { lazy } from 'react';

/**
 * Wraps dynamic component imports with retry and single-reload fallback on chunk load failure.
 * 1. Tries to import the component.
 * 2. On failure, retries once after a 500ms delay.
 * 3. On second failure, triggers a single full page reload (guarded by sessionStorage to prevent loops).
 */
export function lazyWithRetry(componentImport, key = '') {
  return lazy(async () => {
    const pageKey = key || componentImport.toString();
    const sessionKey = `retry-chunk-reload:${pageKey}`;

    try {
      const module = await componentImport();
      try {
        sessionStorage.removeItem(sessionKey);
      } catch (_) {}
      return module;
    } catch (firstError) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const module = await componentImport();
        try {
          sessionStorage.removeItem(sessionKey);
        } catch (_) {}
        return module;
      } catch (secondError) {
        let hasReloaded = false;
        try {
          hasReloaded = sessionStorage.getItem(sessionKey) === 'true';
        } catch (_) {}

        if (!hasReloaded) {
          try {
            sessionStorage.setItem(sessionKey, 'true');
          } catch (_) {}
          window.location.reload();
          return new Promise(() => {});
        }
        throw secondError;
      }
    }
  });
}

export default lazyWithRetry;
