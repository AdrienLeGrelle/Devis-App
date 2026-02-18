/**
 * Layout des blocs du DocumentRenderer en mode édition.
 * Positions par défaut = même disposition que le rendu fixe (flow).
 */

const BLOCK_IDS = ['header', 'client', 'devisInfo', 'table', 'totals', 'conditions'];

const CONTENT_WIDTH = 714;
const CONTENT_HEIGHT = 1053;
const PAGE_PADDING = 40;

/** Positions par défaut pour que rien ne bouge visuellement par rapport au flow */
export function getDefaultDocLayout() {
  return {
    contentWidth: CONTENT_WIDTH,
    contentHeight: CONTENT_HEIGHT,
    footerHeight: 30,
    blocks: [
      { id: 'header', x: 0, y: 0, w: CONTENT_WIDTH, h: 83 },
      { id: 'client', x: 0, y: 83, w: 347, h: 150 },
      { id: 'devisInfo', x: 347, y: 83, w: 367, h: 150 },
      { id: 'table', x: 0, y: 233, w: CONTENT_WIDTH, h: 320 },
      { id: 'totals', x: 414, y: 553, w: 300, h: 60 },
      { id: 'conditions', x: 0, y: 613, w: CONTENT_WIDTH, h: 120 },
    ],
    images: [], // Images déplaçables : [{ id, src, x, y, w, h }]
  };
}

export const DOC_LAYOUT_STORAGE_KEY = 'doc-layout';

export function loadDocLayout() {
  try {
    const raw = localStorage.getItem(DOC_LAYOUT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Accepter si on a des blocs OU des images (persister les images même après modifs)
      if (parsed && (parsed?.blocks?.length || (parsed?.images && parsed.images.length >= 0))) {
        const defaultLayout = getDefaultDocLayout();
        return {
          contentWidth: parsed.contentWidth ?? defaultLayout.contentWidth,
          contentHeight: parsed.contentHeight ?? defaultLayout.contentHeight,
          footerHeight: parsed.footerHeight ?? defaultLayout.footerHeight,
          blocks: Array.isArray(parsed.blocks) && parsed.blocks.length
            ? parsed.blocks
            : defaultLayout.blocks,
          images: Array.isArray(parsed.images) ? parsed.images : [],
        };
      }
    }
  } catch (e) {}
  return null;
}

export function saveDocLayout(layout) {
  localStorage.setItem(DOC_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
}

export { PAGE_PADDING, BLOCK_IDS };
