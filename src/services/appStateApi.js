import { supabase } from './supabaseClient';

const APP_STATE_ID = 'main';

/**
 * Charge l'état global depuis Supabase
 * @returns {Promise<Object|null>} L'état global ou null si erreur/inexistant
 */
export async function loadAppState() {
  if (!supabase) {
    console.warn('[AppState] Supabase non configuré, utilisation du localStorage local');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('app_state')
      .select('data')
      .eq('id', APP_STATE_ID)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Pas de ligne trouvée (normal au premier démarrage)
        console.log('[AppState] Aucun état sauvegardé dans Supabase');
        return null;
      }
      throw error;
    }

    return data?.data || null;
  } catch (error) {
    console.error('[AppState] Erreur lors du chargement depuis Supabase:', error);
    return null;
  }
}

/**
 * Sauvegarde l'état global dans Supabase
 * @param {Object} state - L'état global à sauvegarder
 * @returns {Promise<boolean>} true si succès, false sinon
 */
export async function saveAppState(state) {
  if (!supabase) {
    console.warn('[AppState] Supabase non configuré, sauvegarde locale uniquement');
    return false;
  }

  try {
    const updatedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from('app_state')
      .upsert({
        id: APP_STATE_ID,
        data: state,
        updated_at: updatedAt,
      }, {
        onConflict: 'id'
      });

    if (error) throw error;

    console.log('[AppState] ✓ Saved to Supabase - updated_at:', updatedAt);
    return true;
  } catch (error) {
    console.error('[AppState] ✗ Erreur lors de la sauvegarde dans Supabase:', error);
    console.error('[AppState] Détails:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return false;
  }
}

/**
 * Vérifie si Supabase est disponible
 * @returns {boolean}
 */
export function isSupabaseAvailable() {
  return supabase !== null;
}
