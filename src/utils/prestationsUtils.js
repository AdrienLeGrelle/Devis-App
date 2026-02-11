import { startOfDay } from 'date-fns';

/**
 * Retourne la date du jour à minuit (heure locale).
 */
export function getStartOfToday() {
  return startOfDay(new Date());
}

/**
 * Parse la date d'une prestation (ISO "YYYY-MM-DD", ISO string complète, ou timestamp).
 * Pour "YYYY-MM-DD", parse en date locale (évite les bugs de fuseau).
 * @returns {Date|null} La date parsée ou null si invalide.
 */
export function parsePrestationDate(date) {
  if (date == null || date === '') return null;
  if (typeof date === 'number') {
    const d = new Date(date);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof date === 'string') {
    // YYYY-MM-DD : parser en local pour éviter UTC -> décalage horaire
    const m = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      const y = parseInt(m[1], 10);
      const mo = parseInt(m[2], 10) - 1;
      const d = parseInt(m[3], 10);
      const parsed = new Date(y, mo, d);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    const d = new Date(date);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Récupère la date de prestation (même champ que celui affiché sur la carte).
 */
export function getPrestationDate(presta) {
  return presta?.date ?? null;
}

/**
 * Formate une date pour l'affichage en français : JJ/MM/AAAA.
 * Accepte string "YYYY-MM-DD", ISO string, ou timestamp number.
 * Retourne "" si date invalide ou absente.
 */
export function formatDateFR(dateValue) {
  const d = parsePrestationDate(dateValue);
  if (!d) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Compare deux dates pour le tri. null/undefined en bas.
 * @param {'asc'|'desc'} order - 'asc' = plus proche en haut (croissant), 'desc' = plus récent en haut
 */
export function comparePrestationDates(a, b, order = 'desc') {
  const dA = parsePrestationDate(a);
  const dB = parsePrestationDate(b);
  const hasA = dA != null;
  const hasB = dB != null;
  if (!hasA && !hasB) return 0;
  if (!hasA) return 1;
  if (!hasB) return -1;
  const diff = dB.getTime() - dA.getTime();
  return order === 'asc' ? -diff : diff;
}

/**
 * Tri stable des prestations par date.
 * @param {'asc'|'desc'} order - 'asc' = plus proche/récent en haut (croissant), 'desc' = plus récent en haut
 * Sans date => en bas.
 */
export function sortPrestationsByDate(items, order = 'desc') {
  return [...items].sort((a, b) => {
    const cmp = comparePrestationDates(getPrestationDate(a), getPrestationDate(b), order);
    if (cmp !== 0) return cmp;
    if (a.createdAt != null && b.createdAt != null) {
      return order === 'asc' ? a.createdAt - b.createdAt : b.createdAt - a.createdAt;
    }
    return 0;
  });
}

const STATUT_MARCHE_CONCLU = 'marche_conclu';
const STATUT_FINI = 'fini';

/**
 * Déplace automatiquement les prestations "Marché conclu" dont la date est STRICTEMENT < aujourd'hui vers "Fini".
 * Règle : statut === "marche_conclu" ET date < startOfToday() => passer en "fini".
 * Ne jamais passer en Fini si date === aujourd'hui ou date future.
 */
export function migrateMarcheConcluToFini(prestations) {
  if (!Array.isArray(prestations)) return { prestations: prestations || [], changed: false };
  const today = getStartOfToday();
  const todayTs = today.getTime();
  let changed = false;
  const result = prestations.map((p) => {
    if (p.statut !== STATUT_MARCHE_CONCLU) return p;
    const rawDate = getPrestationDate(p);
    const d = parsePrestationDate(rawDate);
    const prestationDayStart = d ? startOfDay(d).getTime() : null;
    const isStrictlyBeforeToday = prestationDayStart != null && prestationDayStart < todayTs;
    if (!d || !isStrictlyBeforeToday) return p;
    changed = true;
    return { ...p, statut: STATUT_FINI };
  });
  return { prestations: result, changed };
}
