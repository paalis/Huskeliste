export function configSource(env = process.env) {
  const url = (env.SUPABASE_URL || '').trim(), key = (env.SUPABASE_PUBLISHABLE_KEY || '').trim();
  return `export const SUPABASE_URL = ${JSON.stringify(url)};\nexport const SUPABASE_PUBLISHABLE_KEY = ${JSON.stringify(key)};\n`;
}
