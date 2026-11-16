const RELOAD_KEY = 'JIYA_RELOAD_AT';

/** True for the errors a browser raises when a lazy-loaded file from an older deploy is gone from the server. */
export const isStaleChunkError = (error: unknown) =>
  /dynamically imported module|importing a module script|module script failed|loading chunk|unable to preload/i.test(error instanceof Error ? error.message : String(error));

/** Reload once to pick up the new version of the app (not again within a minute, so a real outage cannot loop). */
export function reloadForNewVersion(): boolean {
  try {
    if (Date.now() - Number(sessionStorage.getItem(RELOAD_KEY) || 0) < 60000) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch { /* storage blocked: reload anyway */ }
  window.location.reload();
  return true;
}
