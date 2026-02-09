const SET_ZONES = ['SON', 'LUMIERE', 'DJ'];
const SETS = [
  { id: 'set1', name: 'SET 1' },
  { id: 'set2', name: 'SET 2' },
  { id: 'set3', name: 'SET 3' },
  { id: 'set4', name: 'SET 4' },
];

const DEFAULT_FORMULE_PRESETS = {
  soiree_classique: { name: 'Soirée classique', itemIds: ['it3', 'it42', 'it39', 'it14', 'it22', 'it46'] },
  cours_danse: { name: 'Cours de danse', itemIds: ['it3', 'it42', 'it46'] },
  mariage_classique: { name: 'Mariage classique', itemIds: ['it3', 'it42', 'it39', 'it14', 'it22', 'it26', 'it46', 'it49'] },
  mariage_excellence: { name: 'Mariage excellence', itemIds: ['it6', 'it7', 'it42', 'it39', 'it14', 'it15', 'it22', 'it23', 'it26', 'it46', 'it49'] },
};

export { SET_ZONES, SETS, DEFAULT_FORMULE_PRESETS };

/**
 * Récupère les assignments pour une date (inventory.assignmentsByDate[date])
 */
export function getAssignmentsForDate(inventory, date) {
  if (!date) return {};
  return inventory?.assignmentsByDate?.[date] || {};
}

/**
 * Récupère les noms personnalisés des sets pour une date
 */
export function getSetNamesForDate(inventory, date) {
  if (!date) return {};
  return inventory?.setNamesByDate?.[date] || {};
}

/**
 * Met à jour les assignments pour une date
 */
export function updateAssignmentsForDate(inventory, date, itemId, tags) {
  const byDate = { ...(inventory?.assignmentsByDate || {}) };
  byDate[date] = { ...(byDate[date] || {}), [itemId]: tags };
  return { ...inventory, assignmentsByDate: byDate };
}

/**
 * Items dans le pool (non assignés) pour une date
 */
export function getPoolItemsForDate(items, assignmentsForDate) {
  return items.filter((it) => !(assignmentsForDate[it.id] || []).length);
}

/**
 * Structure assignments par set/zone pour l'affichage
 */
export function buildAssignmentsMap(items, assignmentsForDate) {
  const map = {};
  SETS.forEach((s) => {
    map[s.id] = {};
    SET_ZONES.forEach((z) => {
      map[s.id][z] = [];
    });
  });
  items.forEach((item) => {
    (assignmentsForDate[item.id] || []).forEach((tag) => {
      const [setId, zone] = String(tag).split(':');
      if (map[setId] && map[setId][zone]) {
        map[setId][zone].push(item);
      }
    });
  });
  return map;
}
