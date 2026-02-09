/**
 * Modèle de données pour le layout du devis (canvas éditable)
 */

export const PAGE_A4 = { width: 794, height: 1123, padding: 40 };
const GRID = 8;

function id() {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * @typedef {Object} LayoutItem
 * @property {string} id
 * @property {'field'|'text'|'image'|'shape'} type
 * @property {string} [fieldKey] - ex: "numero", "clientNom", "totalTTC"
 * @property {number} x
 * @property {number} y
 * @property {number} w
 * @property {number} h
 * @property {number} [rotation]
 * @property {number} zIndex
 * @property {Object} [style]
 * @property {boolean} [locked]
 * @property {string} [content] - pour type text
 * @property {string} [src] - pour type image (base64 ou blob URL)
 */

/**
 * Génère le layout par défaut à partir de la structure actuelle du devis
 */
export function getDefaultLayout() {
  return {
    page: { ...PAGE_A4, background: '#ffffff' },
    items: [
      { id: id(), type: 'field', fieldKey: 'titre', x: 40, y: 40, w: 200, h: 40, zIndex: 1, style: { fontSize: 28, fontWeight: 700, color: '#667eea' } },
      { id: id(), type: 'field', fieldKey: 'numero', x: 554, y: 40, w: 200, h: 20, zIndex: 1, style: { fontSize: 12, color: '#666' } },
      { id: id(), type: 'field', fieldKey: 'date', x: 554, y: 62, w: 200, h: 20, zIndex: 1, style: { fontSize: 12, color: '#666' } },
      { id: id(), type: 'field', fieldKey: 'dateValidite', x: 554, y: 84, w: 200, h: 20, zIndex: 1, style: { fontSize: 12, color: '#666' } },
      { id: id(), type: 'field', fieldKey: 'entreprise', x: 554, y: 120, w: 200, h: 120, zIndex: 1, style: { fontSize: 11, color: '#333', textAlign: 'right' } },
      { id: id(), type: 'field', fieldKey: 'client', x: 40, y: 260, w: 400, h: 100, zIndex: 1, style: { fontSize: 12, color: '#333' } },
      { id: id(), type: 'field', fieldKey: 'articlesTable', x: 40, y: 380, w: 714, h: 200, zIndex: 1, style: { fontSize: 12 } },
      { id: id(), type: 'field', fieldKey: 'detailMateriel', x: 40, y: 600, w: 400, h: 120, zIndex: 1, style: { fontSize: 11, color: '#444' } },
      { id: id(), type: 'field', fieldKey: 'totalTTC', x: 554, y: 600, w: 200, h: 40, zIndex: 1, style: { fontSize: 18, fontWeight: 700, color: '#667eea' } },
      { id: id(), type: 'field', fieldKey: 'notes', x: 40, y: 740, w: 350, h: 120, zIndex: 1, style: { fontSize: 11, color: '#555' } },
      { id: id(), type: 'field', fieldKey: 'conditions', x: 410, y: 740, w: 344, h: 120, zIndex: 1, style: { fontSize: 11, color: '#555' } },
      { id: id(), type: 'field', fieldKey: 'footer', x: 40, y: 1050, w: 714, h: 30, zIndex: 1, style: { fontSize: 12, color: '#999', textAlign: 'center' } },
    ],
  };
}

export const STORAGE_KEY = 'quote-layout';

export function loadLayout() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.items?.length) return parsed;
    }
  } catch (e) {}
  return null;
}

export function saveLayout(layout) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
}
