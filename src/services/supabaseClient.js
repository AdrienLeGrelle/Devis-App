import { createClient } from '@supabase/supabase-js';

// Variables d'environnement (lues au moment de l'import)
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Logs de diagnostic détaillés
const urlPresent = !!supabaseUrl;
const keyPresent = !!supabaseAnonKey;
const urlValue = supabaseUrl ? (supabaseUrl.length > 50 ? supabaseUrl.substring(0, 50) + '...' : supabaseUrl) : 'NON DÉFINI';
const keyStart = supabaseAnonKey ? supabaseAnonKey.substring(0, 20) : 'NON DÉFINI';

console.log('[Supabase] ===== DIAGNOSTIC ENV =====');
console.log('[Supabase] URL present?', urlPresent, '| URL:', urlValue);
console.log('[Supabase] KEY present?', keyPresent, '| KEY start:', keyStart);
console.log('[Supabase] =========================');

// Exposer pour debug dans la console navigateur (sans utiliser process.env directement)
if (typeof window !== 'undefined') {
  window.__ENV_DEBUG = {
    urlPresent,
    keyPresent,
    urlValue,
    keyStart,
  };
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] ⚠️ Variables d\'environnement manquantes. Synchronisation désactivée.');
  console.warn('[Supabase] Pour activer: ajoutez REACT_APP_SUPABASE_URL et REACT_APP_SUPABASE_ANON_KEY dans .env');
  console.warn('[Supabase] Puis redémarrez le serveur de développement (npm run dev:react)');
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

if (supabase) {
  console.log('[Supabase] ✓ Client Supabase initialisé avec succès');
} else {
  console.warn('[Supabase] ✗ Client Supabase NON initialisé (fallback localStorage)');
}
