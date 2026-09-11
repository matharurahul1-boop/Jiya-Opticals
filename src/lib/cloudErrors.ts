export function cloudErrorMessage(error: unknown): string {
  const record = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const message = typeof record.message === 'string' ? record.message : typeof error === 'string' ? error : 'Unable to complete the cloud request. Please retry.';
  if (/no api key|invalid api key|invalid apikey/i.test(message)) return 'Supabase API key configuration failed. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY for this deployment, then rebuild and redeploy (or restart the local dev server). Running SQL will not fix this error.';
  if (['PGRST202','PGRST205','42883','42P01'].includes(String(record.code))) return `${message} Database setup is missing or outdated. Run supabase/LIVE_SETUP.sql in the Supabase SQL Editor, then refresh.`;
  if (/failed to fetch|networkerror|network request failed/i.test(message)) return 'Cannot reach Supabase. Check your internet connection and configured project URL, then retry.';
  return message;
}
