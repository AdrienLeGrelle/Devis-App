import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Rnd } from 'react-rnd';
import { useUndoRedo } from '../hooks/useUndoRedo';
import './DevisPreview.css';
import { format } from 'date-fns';
import fr from 'date-fns/locale/fr';
import { getItemsBySet, calculerTotalDevis } from '../utils/devisUtils';
import { formatFooterEntreprise } from '../utils/formatFooterEntreprise';
import DraggableBlock from './DraggableBlock';

const QUOTE_ID = 'current';
const IMAGES_KEY = `quoteImages:${QUOTE_ID}`;
const LAYOUT_KEY = `quoteBlocksLayout:${QUOTE_ID}`;

// Constantes A4 standardisées (96dpi)
const PAGE_WIDTH_PX = 794;
const PAGE_HEIGHT_PX = 1123;
const PAGE_PADDING = 40;
const CONTENT_WIDTH = PAGE_WIDTH_PX - 2 * PAGE_PADDING;
const CONTENT_HEIGHT = PAGE_HEIGHT_PX - 2 * PAGE_PADDING;
const FOOTER_HEIGHT = 30;

const BLOCK_IDS = [
  'headerTitle',
  'headerSeparator',
  'devisInfoCard',
  'billedTo',
  'itemsTable',
  'materielDetail',
  'totalBox',
  'notesSection',
  'footerSection',
];

// Modèle de données unifié : { id, type, pageIndex, x, y, w, h, zIndex }
// Bloc coordonnées entreprise supprimé : on ne rend plus companyCard/companyBox
const DEPRECATED_BLOCK_IDS = ['companyCard', 'companyBox', 'company-info'];
function migrateLayout(oldLayout) {
  if (!oldLayout) return {};
  const migrated = {};
  for (const [id, val] of Object.entries(oldLayout)) {
    if (DEPRECATED_BLOCK_IDS.includes(id)) continue;
    if (val && typeof val === 'object') {
      migrated[id] = {
        pageIndex: val.pageIndex ?? 0,
        x: val.x ?? 0,
        y: val.y ?? 0,
        w: val.w,
        h: val.h,
        zIndex: val.zIndex ?? 0,
      };
    }
  }
  return migrated;
}

function loadImages() {
  try {
    const raw = localStorage.getItem(IMAGES_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return arr.map((img) => ({
      ...img,
      pageIndex: img.pageIndex ?? 0,
      x: img.x ?? 100,
      y: img.y ?? 100,
      w: img.w ?? 200,
      h: img.h ?? 150,
      zIndex: img.zIndex ?? 0,
    }));
  } catch (e) {
    return [];
  }
}

function saveImages(images) {
  localStorage.setItem(IMAGES_KEY, JSON.stringify(images));
}

function loadLayout() {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return migrateLayout(parsed);
  } catch (e) {
    return null;
  }
}

function saveLayout(layout) {
  localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
}

const initialQuoteState = () => ({
  layoutOffsets: loadLayout() || {},
  pastedImages: loadImages(),
});

const SAVE_DEBOUNCE_MS = 300;

function DevisPreview({ devisData, inventory, registerUndoManager, pricePerKm = 0.60 }) {
  const [isLayoutEdit, setIsLayoutEdit] = useState(false);
  const [selectedImageId, setSelectedImageId] = useState(null);
  const [blockOrigins, setBlockOrigins] = useState({});
  const [layoutResetKey, setLayoutResetKey] = useState(0);
  const pagesContainerRef = useRef(null);
  const pageRefs = useRef({});

  const quoteUndo = useUndoRedo(initialQuoteState(), 50);
  const { present, setPresent, commit, undo, redo, canUndo, canRedo } = quoteUndo;
  const { layoutOffsets, pastedImages } = present;

  // Calculer le nombre de pages nécessaires
  const getMaxPageIndex = useCallback(() => {
    let maxPage = 0;
    // Parcourir tous les blocs et images pour trouver la page max
    Object.values(layoutOffsets).forEach((block) => {
      if (block.pageIndex != null && block.pageIndex > maxPage) {
        maxPage = block.pageIndex;
      }
    });
    pastedImages.forEach((img) => {
      if (img.pageIndex != null && img.pageIndex > maxPage) {
        maxPage = img.pageIndex;
      }
    });
    return Math.max(0, maxPage);
  }, [layoutOffsets, pastedImages]);

  const numPages = Math.max(1, getMaxPageIndex() + 1);

  const getBlockData = (id) => {
    const data = layoutOffsets[id];
    if (!data) {
      // Initialiser les blocs par défaut sur la page 0
      return { pageIndex: 0, x: 0, y: 0, w: undefined, h: undefined, zIndex: 0 };
    }
    return {
      pageIndex: data.pageIndex ?? 0,
      x: data.x ?? 0,
      y: data.y ?? 0,
      w: data.w,
      h: data.h,
      zIndex: data.zIndex ?? 0,
    };
  };

  useEffect(() => {
    if (registerUndoManager) {
      registerUndoManager({ undo, redo, canUndo, canRedo });
    }
    return () => {
      if (registerUndoManager) registerUndoManager(null);
    };
  }, [registerUndoManager, undo, redo, canUndo, canRedo]);

  const saveRef = useRef(null);
  const pendingRef = useRef({ pastedImages: null, layoutOffsets: null });
  pendingRef.current = { pastedImages, layoutOffsets };
  useEffect(() => {
    if (saveRef.current) clearTimeout(saveRef.current);
    saveRef.current = setTimeout(() => {
      saveImages(pastedImages);
      saveLayout(layoutOffsets);
      saveRef.current = null;
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveRef.current) {
        clearTimeout(saveRef.current);
        saveRef.current = null;
        const p = pendingRef.current;
        if (p) {
          saveImages(p.pastedImages);
          saveLayout(p.layoutOffsets);
        }
      }
    };
  }, [pastedImages, layoutOffsets]);

  const handlePaste = useCallback(
    (e) => {
      if (!isLayoutEdit) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          const reader = new FileReader();
          reader.onload = (ev) => {
            // Trouver la page courante (centrée dans la vue)
            const container = pagesContainerRef.current;
            if (!container) return;
            const containerRect = container.getBoundingClientRect();
            const scrollTop = container.scrollTop || 0;
            const centerY = scrollTop + containerRect.height / 2;
            const currentPageIndex = Math.max(0, Math.floor(centerY / (PAGE_HEIGHT_PX + 32)));
            
            const newImg = {
              id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `img-${Date.now()}`,
              src: ev.target.result,
              pageIndex: currentPageIndex,
              x: CONTENT_WIDTH / 2 - 100,
              y: CONTENT_HEIGHT / 2 - 75,
              w: 200,
              h: 150,
              zIndex: 0,
            };
            setPresent(
              (prev) => ({ ...prev, pastedImages: [...prev.pastedImages, newImg] }),
              { commit: true }
            );
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    },
    [setPresent, isLayoutEdit]
  );

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const updateImage = useCallback(
    (id, updates, options = {}) => {
      setPresent(
        (prev) => {
          const nextImages = prev.pastedImages.map((img) =>
            img.id === id ? { ...img, ...updates } : img
          );
          if (options.saveImmediate) saveImages(nextImages);
          return { ...prev, pastedImages: nextImages };
        },
        options
      );
    },
    [setPresent]
  );

  const deleteImage = useCallback(
    (id) => {
      setPresent(
        (prev) => ({
          ...prev,
          pastedImages: prev.pastedImages.filter((img) => img.id !== id),
        }),
        { commit: true }
      );
      setSelectedImageId(null);
    },
    [setPresent]
  );

  const handleLayoutDragStart = useCallback((id) => {
    commit();
  }, [commit]);

  // Calcul de la page cible depuis la position globale du drag
  const calculatePageFromGlobalY = useCallback((clientY, currentPageIndex) => {
    const container = pagesContainerRef.current;
    if (!container) return { targetPageIndex: currentPageIndex, yLocal: 0 };
    
    const containerRect = container.getBoundingClientRect();
    const scrollTop = container.scrollTop || 0;
    const relativeY = clientY - containerRect.top + scrollTop;
    
    // Chaque page fait PAGE_HEIGHT_PX + gap (32px)
    const pageHeightWithGap = PAGE_HEIGHT_PX + 32;
    const targetPageIndex = Math.max(0, Math.floor(relativeY / pageHeightWithGap));
    const yLocal = relativeY - targetPageIndex * pageHeightWithGap - PAGE_PADDING;
    
    return { targetPageIndex, yLocal };
  }, []);

  const handleLayoutDrag = useCallback(
    (id, newX, newY, e) => {
      const blockData = getBlockData(id);
      const currentPageIndex = blockData.pageIndex || 0;
      
      // Calculer la page cible depuis la position globale du pointeur
      const container = pagesContainerRef.current;
      if (!container || !e) return;
      
      const containerRect = container.getBoundingClientRect();
      const scrollTop = container.scrollTop || 0;
      // Position Y globale dans le document (toutes pages empilées)
      const relativeY = e.clientY - containerRect.top + scrollTop;
      const pageHeightWithGap = PAGE_HEIGHT_PX + 32;
      const targetPageIndex = Math.max(0, Math.floor(relativeY / pageHeightWithGap));
      
      setPresent((prev) => {
        const existing = prev.layoutOffsets[id] || {};
        const nextLayout = {
          ...prev.layoutOffsets,
          [id]: {
            ...existing,
            pageIndex: targetPageIndex,
            x: newX,
            y: newY,
          },
        };
        return { ...prev, layoutOffsets: nextLayout };
      }, {});
    },
    [setPresent]
  );

  const handleLayoutDragStop = useCallback(
    (id, newX, newY, e) => {
      const blockData = getBlockData(id);
      const currentPageIndex = blockData.pageIndex || 0;
      
      // Calculer la page cible depuis la position globale du pointeur
      const container = pagesContainerRef.current;
      if (!container || !e) return;
      
      const containerRect = container.getBoundingClientRect();
      const scrollTop = container.scrollTop || 0;
      const relativeY = e.clientY - containerRect.top + scrollTop;
      const pageHeightWithGap = PAGE_HEIGHT_PX + 32;
      const targetPageIndex = Math.max(0, Math.floor(relativeY / pageHeightWithGap));
      
      setPresent((prev) => {
        const existing = prev.layoutOffsets[id] || {};
        const nextLayout = {
          ...prev.layoutOffsets,
          [id]: {
            ...existing,
            pageIndex: targetPageIndex,
            x: newX,
            y: newY,
          },
        };
        saveLayout(nextLayout);
        return { ...prev, layoutOffsets: nextLayout };
      }, { commit: true });
    },
    [setPresent]
  );

  const handleImageDrag = useCallback(
    (imgId, e, d, pageIndex) => {
      const img = pastedImages.find((i) => i.id === imgId);
      if (!img) return;
      
      const { targetPageIndex, yLocal } = calculatePageFromGlobalY(e.clientY, pageIndex);
      
      const clampedX = Math.max(0, Math.min(CONTENT_WIDTH - (img.w || 200), d.x));
      const clampedY = Math.max(0, Math.min(CONTENT_HEIGHT - FOOTER_HEIGHT - (img.h || 150), yLocal));
      
      updateImage(imgId, {
        pageIndex: targetPageIndex,
        x: clampedX,
        y: clampedY,
      }, {});
    },
    [pastedImages, updateImage, calculatePageFromGlobalY]
  );

  const handleImageDragStop = useCallback(
    (imgId, e, d, pageIndex) => {
      const img = pastedImages.find((i) => i.id === imgId);
      if (!img) return;
      
      const { targetPageIndex, yLocal } = calculatePageFromGlobalY(e.clientY, pageIndex);
      
      const clampedX = Math.max(0, Math.min(CONTENT_WIDTH - (img.w || 200), d.x));
      const clampedY = Math.max(0, Math.min(CONTENT_HEIGHT - FOOTER_HEIGHT - (img.h || 150), yLocal));
      
      updateImage(imgId, {
        pageIndex: targetPageIndex,
        x: clampedX,
        y: clampedY,
      }, { commit: true, saveImmediate: true });
    },
    [pastedImages, updateImage, calculatePageFromGlobalY]
  );

  const handleFinishEdit = useCallback(() => {
    saveLayout(layoutOffsets);
    saveImages(pastedImages);
    setIsLayoutEdit(false);
  }, [layoutOffsets, pastedImages]);

  const handleResetLayout = useCallback(() => {
    localStorage.removeItem(LAYOUT_KEY);
    setPresent((prev) => ({ ...prev, layoutOffsets: {} }), { commit: false });
    setBlockOrigins({});
    setLayoutResetKey((k) => k + 1);
  }, [setPresent]);

  // Mesure des blocs par page
  useEffect(() => {
    if (!isLayoutEdit) {
      setBlockOrigins({});
      return;
    }
    const timer = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const blocks = {};
        for (let pageIdx = 0; pageIdx < numPages; pageIdx++) {
          const pageRef = pageRefs.current[pageIdx];
          if (!pageRef) continue;
          
          const containerRect = pageRef.getBoundingClientRect();
          BLOCK_IDS.forEach((id) => {
            const blockData = getBlockData(id);
            if (blockData.pageIndex !== pageIdx) return;
            
            const el = pageRef.querySelector(`[data-block-id="${id}"]`);
            if (el) {
              const rect = el.getBoundingClientRect();
              const x = rect.left - containerRect.left - PAGE_PADDING;
              const y = rect.top - containerRect.top - PAGE_PADDING;
              blocks[`${id}_${pageIdx}`] = {
                id,
                pageIndex: pageIdx,
                x,
                y,
                w: rect.width,
                h: rect.height,
                baseX: x - (blockData.x || 0),
                baseY: y - (blockData.y || 0),
              };
            }
          });
        }
        if (Object.keys(blocks).length > 0) setBlockOrigins(blocks);
      });
    });
    return () => cancelAnimationFrame(timer);
  }, [isLayoutEdit, layoutResetKey, layoutOffsets, numPages]);

  if (!devisData) {
    return (
      <div className="devis-preview">
        <div className="preview-loading">Chargement...</div>
      </div>
    );
  }

  const totalTTC = calculerTotalDevis(devisData, pricePerKm);
  const dateDevis = devisData.date ? format(new Date(devisData.date), 'dd/MM/yyyy', { locale: fr }) : '';
  const dateValidite =
    devisData.date && devisData.validite
      ? format(
          new Date(new Date(devisData.date).getTime() + devisData.validite * 24 * 60 * 60 * 1000),
          'dd/MM/yyyy',
          { locale: fr }
        )
      : '';
  const ent = devisData.entreprise || {};
  const client = devisData.client || {};
  const formule = devisData.formuleChoisie;
  const options = devisData.optionsChoisies || [];
  const km = Number(devisData.kmDeplacement) || 0;
  const montantTransport = km * pricePerKm;
  const datePresta = devisData.dateDebutPrestation || devisData.date;
  const detailMateriel = formule?.setId ? getItemsBySet(inventory || {}, formule.setId, datePresta) : [];

  const getBlockTransform = (id) => {
    const o = getBlockData(id);
    if (!o || (o.x === 0 && o.y === 0)) return undefined;
    return `translate(${o.x}px, ${o.y}px)`;
  };

  const renderBlock = (id, pageIndex) => {
    const blockData = getBlockData(id);
    if (blockData.pageIndex !== pageIndex) return null;
    
    const transform = getBlockTransform(id);
    const style = transform ? { transform } : undefined;
    const common = { key: `${id}_${pageIndex}`, 'data-block-id': id, style };

    switch (id) {
      case 'headerTitle':
        return (
          <div className="header-left" {...common}>
            <h1>DEVIS</h1>
          </div>
        );
      case 'devisInfoCard':
        return (
          <div className="devis-info-section" {...common}>
            <h3>Devis</h3>
            <div className="devis-info-box">
              {devisData.numero && (
                <p><strong>N° :</strong> {devisData.numero}</p>
              )}
              {dateDevis && (
                <p><strong>Date :</strong> {dateDevis}</p>
              )}
              {devisData.validite && (
                <p>
                  <strong>Validité :</strong> {devisData.validite} jour{Number(devisData.validite) > 1 ? 's' : ''}
                  {dateValidite && ` (→ ${dateValidite})`}
                </p>
              )}
              {(devisData.dateDebutPrestation || devisData.horairePrestation || devisData.lieuPrestation) && (
                <p>
                  <strong>Prestation :</strong>{' '}
                  {[
                    devisData.dateDebutPrestation && format(new Date(devisData.dateDebutPrestation), 'dd/MM/yyyy', { locale: fr }),
                    devisData.horairePrestation,
                    devisData.lieuPrestation,
                  ].filter(Boolean).join(' • ')}
                </p>
              )}
            </div>
          </div>
        );
      case 'headerSeparator': {
        const data = getBlockData(id);
        const sepStyle = {
          ...common.style,
          ...(data.w != null && { width: `${data.w}px` }),
        };
        return (
          <div className="separator-line-block" {...common} style={sepStyle}>
            <div className="separator-line-inner" />
          </div>
        );
      }
      case 'billedTo':
        return (
          <div className="client-section" {...common}>
            <h3>Facturé à :</h3>
            <div className="client-box">
              <p>
                {client.prenom && <>{client.prenom} </>}
                <strong>{client.nom || 'Nom du client'}</strong>
              </p>
              <p>{client.adresse}</p>
              <p>{client.codePostal} {client.ville}</p>
              {client.telephone && <p>Tél : {client.telephone}</p>}
              {client.email && <p>Email : {client.email}</p>}
            </div>
          </div>
        );
      case 'itemsTable':
        return (
          <div className="articles-table" {...common}>
            <table>
              <thead>
                <tr>
                  <th>Désignation</th>
                  <th className="num">Quantité</th>
                  <th className="num">Prix unitaire HT</th>
                  <th className="num">TVA</th>
                  <th className="num">Total TTC</th>
                </tr>
              </thead>
              <tbody>
                {formule && (
                  <>
                    <tr>
                      <td>{formule.label}</td>
                      <td className="num">1</td>
                      <td className="num">{(formule.prixTTC / 1.2).toFixed(2)} €</td>
                      <td className="num">20 %</td>
                      <td className="num">{formule.prixTTC.toFixed(2)} €</td>
                    </tr>
                    {formule.breakdown?.length > 0 && formule.breakdown.map((bd) => (
                      <tr key={bd.id} className="breakdown-row">
                        <td colSpan="4" className="breakdown-label">{bd.label}</td>
                        <td className="num breakdown-amount">{bd.amountTTC.toFixed(2)} €</td>
                      </tr>
                    ))}
                  </>
                )}
                {options.map((opt) => {
                  const qty = Number(opt.quantite) || 1;
                  const totalOpt = (opt.prixTTC || 0) * qty;
                  const htOpt = totalOpt / 1.2;
                  return (
                    <tr key={opt.id}>
                      <td>Option : {opt.label}</td>
                      <td className="num">{qty}</td>
                      <td className="num">{(htOpt / qty).toFixed(2)} €</td>
                      <td className="num">20 %</td>
                      <td className="num">{totalOpt.toFixed(2)} €</td>
                    </tr>
                  );
                })}
                {km > 0 && (
                  <tr>
                    <td>Transport ({km} km × {pricePerKm.toFixed(2)} €/km)</td>
                    <td className="num">1</td>
                    <td className="num">{montantTransport.toFixed(2)} €</td>
                    <td className="num">0 %</td>
                    <td className="num">{montantTransport.toFixed(2)} €</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
      case 'materielDetail':
        return null;
      case 'totalBox':
        return (
          <div className="totals-section" {...common}>
            <div className="totals-table">
              <div className="total-row total-final">
                <span>Total TTC :</span>
                <span>{totalTTC.toFixed(2)} €</span>
              </div>
            </div>
          </div>
        );
      case 'notesSection':
        if (!devisData.notes && !devisData.conditions) return null;
        return (
          <div className="notes-section" {...common}>
            {devisData.notes && (
              <div className="notes-box">
                <h4>Notes :</h4>
                <p>{devisData.notes}</p>
              </div>
            )}
            {devisData.conditions && (
              <div className="conditions-box">
                <h4>Conditions de paiement :</h4>
                <p>{devisData.conditions}</p>
              </div>
            )}
          </div>
        );
      case 'footerSection':
        return null; // Remplacé par le footer Melodix fixe
      default:
        return null;
    }
  };

  const renderPageFooter = (pageIndex) => {
    const entreprise = devisData?.entreprise || {};
    const footerLine = formatFooterEntreprise(entreprise);
    
    return (
      <div className="page-footer">
        <div className="page-footer-border" />
        <div className="page-footer-content">
          {footerLine || '\u00A0'}
        </div>
      </div>
    );
  };

  const renderPage = (pageIndex) => {
    const blocksOnPage = BLOCK_IDS.filter((id) => {
      const blockData = getBlockData(id);
      return blockData.pageIndex === pageIndex;
    });

    return (
      <div
        key={pageIndex}
        ref={(el) => {
          if (el) pageRefs.current[pageIndex] = el;
        }}
        className="page"
        style={{
          width: PAGE_WIDTH_PX,
          height: PAGE_HEIGHT_PX,
          padding: PAGE_PADDING,
        }}
      >
        <div className="page-inner" style={{ paddingBottom: FOOTER_HEIGHT }}>
          {pageIndex === 0 && (
            <>
              <div className="devis-header">
                {renderBlock('headerTitle', pageIndex)}
              </div>
              {renderBlock('headerSeparator', pageIndex)}
              <div className="top-row">
                {renderBlock('billedTo', pageIndex)}
                {renderBlock('devisInfoCard', pageIndex)}
              </div>
            </>
          )}
          {blocksOnPage.map((id) => {
            if (['headerTitle', 'headerSeparator', 'devisInfoCard', 'billedTo'].includes(id) && pageIndex === 0) {
              return null;
            }
            return renderBlock(id, pageIndex);
          })}
        </div>

        {/* Footer Melodix fixe en bas */}
        {renderPageFooter(pageIndex)}

        {/* Overlay de drag pour cette page */}
        {isLayoutEdit && Object.keys(blockOrigins).length > 0 && (
          <div
            className="layout-overlay"
            style={{
              top: PAGE_PADDING,
              left: PAGE_PADDING,
              right: PAGE_PADDING,
              bottom: PAGE_PADDING + FOOTER_HEIGHT,
            }}
          >
            {Object.entries(blockOrigins)
              .filter(([key, orig]) => orig.pageIndex === pageIndex)
              .map(([key, orig]) => {
                const offset = getBlockData(orig.id);
                // baseX/Y = position sans transform, currentX/Y = transform
                const baseX = orig.baseX ?? orig.x - (offset.x || 0);
                const baseY = orig.baseY ?? orig.y - (offset.y || 0);
                // Position actuelle mesurée dans le canvas (avec transform)
                const measuredX = orig.x;
                const measuredY = orig.y;
                return (
                  <DraggableBlock
                    key={key}
                    id={orig.id}
                    canvasRef={pagesContainerRef}
                    pageRef={pageRefs.current[pageIndex]}
                    pageIndex={pageIndex}
                    baseX={baseX}
                    baseY={baseY}
                    measuredX={measuredX}
                    measuredY={measuredY}
                    width={orig.w}
                    height={orig.h}
                    currentX={offset.x || 0}
                    currentY={offset.y || 0}
                    onDragStart={handleLayoutDragStart}
                    onDrag={handleLayoutDrag}
                    onDragStop={handleLayoutDragStop}
                    contentWidth={CONTENT_WIDTH}
                    contentHeight={CONTENT_HEIGHT}
                    footerHeight={FOOTER_HEIGHT}
                    editMode={isLayoutEdit}
                  >
                    <div
                      className="layout-overlay-frame"
                      style={{
                        width: orig.w,
                        height: orig.h,
                        pointerEvents: 'auto',
                      }}
                    >
                      <span className="layout-drag-handle" title="Glisser" />
                    </div>
                  </DraggableBlock>
                );
              })}
          </div>
        )}

        {/* Images sur cette page */}
        {pastedImages
          .filter((img) => img.pageIndex === pageIndex)
          .map((img) => (
            <Rnd
              key={img.id}
              size={{ width: img.w ?? 200, height: img.h ?? 150 }}
              position={{ x: img.x ?? 100, y: img.y ?? 100 }}
              onDragStart={() => commit()}
              onDrag={(e, d) => handleImageDrag(img.id, e, d, pageIndex)}
              onDragStop={(e, d) => handleImageDragStop(img.id, e, d, pageIndex)}
              onResizeStart={() => commit()}
              onResize={(e, direction, ref, delta, position) => {
                updateImage(img.id, {
                  w: parseInt(ref.style.width, 10),
                  h: parseInt(ref.style.height, 10),
                  x: position.x,
                  y: position.y,
                });
              }}
              onResizeStop={(e, direction, ref, delta, position) => {
                updateImage(img.id, {
                  w: parseInt(ref.style.width, 10),
                  h: parseInt(ref.style.height, 10),
                  x: position.x,
                  y: position.y,
                }, { commit: true, saveImmediate: true });
              }}
              onMouseDown={() => isLayoutEdit && setSelectedImageId(img.id)}
              disableDragging={!isLayoutEdit}
              enableResizing={isLayoutEdit}
              bounds={undefined}
              className={`pasted-image ${isLayoutEdit ? 'pasted-image--editing' : ''} ${isLayoutEdit && selectedImageId === img.id ? 'selected' : ''}`}
            >
              <img src={img.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              {isLayoutEdit && selectedImageId === img.id && (
                <button
                  type="button"
                  className="image-delete-btn"
                  onClick={() => deleteImage(img.id)}
                  title="Supprimer"
                >
                  ×
                </button>
              )}
            </Rnd>
          ))}
      </div>
    );
  };

  return (
    <div className={`devis-preview ${isLayoutEdit ? 'is-layout-edit' : ''}`}>
      <div className="preview-toolbar">
        <button
          type="button"
          className={`toolbar-toggle-btn ${isLayoutEdit ? 'active' : ''}`}
          onClick={() => (isLayoutEdit ? handleFinishEdit() : setIsLayoutEdit(true))}
        >
          {isLayoutEdit ? 'Terminer' : 'Modifier la mise en page'}
        </button>
        {isLayoutEdit && (
          <button type="button" className="toolbar-btn" onClick={handleResetLayout}>
            Réinitialiser
          </button>
        )}
        <button type="button" className="toolbar-btn" onClick={() => window.print()} title="Imprimer / Export PDF">
          🖨️ Imprimer
        </button>
        {isLayoutEdit && (
          <span className="toolbar-hint">Ctrl+V pour coller une image</span>
        )}
      </div>
      <div className="preview-container">
        <div className="pages-container" ref={pagesContainerRef}>
          {Array.from({ length: numPages }, (_, i) => (
            <div key={i} className="page-wrapper">
              <div className="page-label">Page {i + 1}</div>
              {renderPage(i)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DevisPreview;
