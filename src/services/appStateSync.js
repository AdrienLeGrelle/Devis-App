import { loadAppState, saveAppState } from './appStateApi';

/**
 * Sérialise l'état global de l'application
 */
export function serializeAppState(state) {
  return {
    devisData: state.devisData,
    formulas: state.formulas,
    options: state.options,
    pricePerKm: state.pricePerKm,
    inventory: state.inventory,
    prestations: state.prestations,
    facturant: state.facturant,
    facturantPresets: state.facturantPresets || {},
  };
}

/**
 * Désérialise l'état global depuis Supabase
 */
export function deserializeAppState(savedState, defaultState) {
  if (!savedState) return null; // null signifie "pas d'état sauvegardé"

  return {
    devisData: savedState.devisData || defaultState.devisData,
    formulas: savedState.formulas || defaultState.formulas,
    options: savedState.options || defaultState.options,
    pricePerKm: savedState.pricePerKm ?? defaultState.pricePerKm,
    inventory: savedState.inventory || defaultState.inventory,
    prestations: savedState.prestations || defaultState.prestations,
    facturant: savedState.facturant || defaultState.facturant,
    facturantPresets: savedState.facturantPresets || defaultState.facturantPresets || {},
  };
}

/**
 * Charge l'état depuis Supabase et retourne l'état désérialisé
 * Retourne null si aucun état n'existe dans Supabase
 */
export async function loadStateFromSupabase(defaultState) {
  const savedState = await loadAppState();
  if (!savedState) return null; // Aucun état dans Supabase
  return deserializeAppState(savedState, defaultState);
}

/**
 * Debounce helper pour éviter trop de sauvegardes
 */
export function createDebouncedSave(delay = 500) {
  let timeoutId = null;
  
  return (state, callback) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(async () => {
      const serialized = serializeAppState(state);
      const success = await saveAppState(serialized);
      if (callback) callback(success);
    }, delay);
  };
}
