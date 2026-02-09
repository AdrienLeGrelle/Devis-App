import React, { useState, useCallback, useEffect, useRef } from 'react';
import Draggable from 'react-draggable';
import { Rnd } from 'react-rnd';
import { useUndoRedo } from '../hooks/useUndoRedo';
import './DevisPreview.css';
import { format } from 'date-fns';
import fr from 'date-fns/locale/fr';
import { getItemsBySet, calculerTotalDevis } from '../utils/devisUtils';
import { TARIF_KM } from '../config/melodix';

const QUOTE_ID = 'current';
const IMAGES_KEY = `quoteImages:${QUOTE_ID}`;
const LAYOUT_KEY = `quoteBlocksLayout:${QUOTE_ID}`;

// A4 @ 96dpi
const PAGE_WIDTH_PX = 794;
const PAGE_HEIGHT_PX = 1123;
const PAGE_PADDING = 48;
const MARGIN_BOTTOM = 48;
const CONTENT_W = PAGE_WIDTH_PX - 2 * PAGE_PADDING;
const CONTENT_H = PAGE_HEIGHT_PX - 2 * PAGE_PADDING;

const BLOCK_IDS = [
  'headerTitle',
  'companyCard',
  'billedTo',
  'itemsTable',
  'materielDetail',
  'totalBox',
  'notesSection',
  'footerSection',
];

function loadImages() {
  try {
    const raw = localStorage.getItem(IMAGES_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return arr.map((img) => ({
      ...img,
      x: img.x ?? 100,
      y: img.y ?? 100,
      w: img.w ?? 200,
      h: img.h ?? 150,
      pageIndex: img.pageIndex ?? 0,
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
    if (!parsed || typeof parsed !== 'object') return null;
    const migrated = {};
    for (const [id, val] of Object.entries(parsed)) {
      if (val && typeof val === 'object' && ('x' in val || 'y' in val)) {
        migrated[id] = {
          pageIndex: val.pageIndex ?? 0,
          x: val.x ?? 0,
          y: val.y ?? 0,
        };
      }
    }
    return Object.keys(migrated).length > 0 ? migrated : null;
  } catch (e) {
    return null;
  }
}

function saveLayout(layout) {
  localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
}

const initialQuoteState = () => {
  const savedLayout = loadLayout();
  return {
    layoutOffsets: savedLayout || {},
    pastedImages: loadImages(),
  };
};

const SAVE_DEBOUNCE_MS = 300;

// Composant pour un bloc draggable avec wrapper unique
function DraggableBlock({ id, block, content, isLayoutEdit, onDragStart, onDrag, onDragStop, pageRef }) {
  const wrapperRef = useRef(null);
  const x = block.x ?? 0;
  const y = block.y ?? 0;
  const posX = PAGE_PADDING + x;
  const posY = PAGE_PADDING + y;

  if (!isLayoutEdit) {
    return (
      <div
        ref={wrapperRef}
        className="block-wrapper"
        data-block-wrapper-id={id}
        style={{
          position: 'absolute',
          left: posX,
          top: posY,
          zIndex: 1,
        }}
      >
        {content}
      </div>
    );
  }

  return (
    <Draggable
      position={{ x: posX, y: posY }}
      onStart={onDragStart}
      onDrag={onDrag}
      onStop={onDragStop}
      handle=".block-drag-handle"
      cancel="input,textarea,select,button,a"
    >
      <div
        ref={wrapperRef}
        className="block-wrapper block-editing"
        data-block-wrapper-id={id}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          zIndex: 10,
        }}
      >
        <span className="block-drag-handle" title="Glisser" />
        <div className="block-outline" />
        {content}
      </div>
    </Draggable>
  );
}

// Composant pour une page A4
function LayoutPage({
  pageIndex,
  blocksOnPage,
  blockContents,
  isLayoutEdit,
  pastedImages,
  onBlockDragStart,
  onBlockDrag,
  onBlockDragStop,
  onImageDrag,
  onImageDragStop,
  onImageResize,
  onImageResizeStop,
  onImageDelete,
  selectedImageId,
  setSelectedImageId,
  updateImage,
  clampToPage,
  commit,
  pageRef,
}) {
  const headerBlocks = ['headerTitle', 'companyCard'];
  const hasHeader = headerBlocks.some((id) => blocksOnPage.includes(id));
  const hasHeaderLeft = blocksOnPage.includes('headerTitle');
  const hasHeaderRight = blocksOnPage.includes('companyCard');
  const allHaveLayout = blocksOnPage.length > 0 && blocksOnPage.every((id) => blockContents[id] !== undefined);

  return (
    <div className="page-wrapper">
      <div className="page-label">Page {pageIndex + 1}</div>
      <div
        ref={pageRef}
        className="page"
        data-page={pageIndex}
        style={{
          width: PAGE_WIDTH_PX,
          height: PAGE_HEIGHT_PX,
          padding: PAGE_PADDING,
          position: 'relative',
        }}
      >
        <div className="page-inner">
          {!allHaveLayout ? (
            <>
              {hasHeader ? (
                <div className="devis-header">
                  {hasHeaderLeft && blockContents['headerTitle']?.content}
                  {hasHeaderRight && blockContents['companyCard']?.content}
                </div>
              ) : (
                <>
                  {blocksOnPage.includes('headerTitle') && blockContents['headerTitle']?.content}
                  {blocksOnPage.includes('companyCard') && blockContents['companyCard']?.content}
                </>
              )}
              {blocksOnPage.includes('billedTo') && blockContents['billedTo']?.content}
              {blocksOnPage.includes('itemsTable') && blockContents['itemsTable']?.content}
              {blocksOnPage.includes('materielDetail') && blockContents['materielDetail']?.content}
              {blocksOnPage.includes('totalBox') && blockContents['totalBox']?.content}
              {blocksOnPage.includes('notesSection') && blockContents['notesSection']?.content}
              {blocksOnPage.includes('footerSection') && blockContents['footerSection']?.content}
            </>
          ) : (
            blocksOnPage.map((id) => {
              const block = blockContents[id]?.block;
              const content = blockContents[id]?.content;
              if (!block || !content) return null;
              return (
                <DraggableBlock
                  key={id}
                  id={id}
                  block={block}
                  content={content}
                  isLayoutEdit={isLayoutEdit}
                  onDragStart={() => onBlockDragStart(id)}
                  onDrag={(e, d) => onBlockDrag(id, e, d, false)}
                  onDragStop={(e, d) => onBlockDrag(id, e, d, true)}
                  pageRef={pageRef}
                />
              );
            })
          )}
        </div>

        {pastedImages
          .filter((img) => (img.pageIndex ?? 0) === pageIndex)
          .map((img) => (
            <Rnd
              key={img.id}
              size={{ width: img.w ?? 200, height: img.h ?? 150 }}
              position={{ x: img.x ?? 100, y: img.y ?? 100 }}
              onDragStart={() => commit()}
              onDrag={(e, d) => onImageDrag(img.id, e, d, false)}
              onDragStop={(e, d) => onImageDrag(img.id, e, d, true)}
              onResizeStart={() => commit()}
              onResize={(e, direction, ref, delta, position) => {
                onImageResize(img.id, ref, position);
              }}
              onResizeStop={(e, direction, ref, delta, position) => {
                const w = parseInt(ref.style.width, 10);
                const h = parseInt(ref.style.height, 10);
                const c = clampToPage(position.x, position.y, w, h);
                onImageResizeStop(img.id, w, h, c.x, c.y);
              }}
              onMouseDown={() => isLayoutEdit && setSelectedImageId(img.id)}
              disableDragging={!isLayoutEdit}
              enableResizing={isLayoutEdit}
              className={`pasted-image ${isLayoutEdit ? 'pasted-image--editing' : ''} ${isLayoutEdit && selectedImageId === img.id ? 'selected' : ''}`}
            >
              <img src={img.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              {isLayoutEdit && selectedImageId === img.id && (
                <button
                  type="button"
                  className="image-delete-btn"
                  onClick={() => onImageDelete(img.id)}
                  title="Supprimer"
                >
                  ×
                </button>
              )}
            </Rnd>
          ))}
      </div>
    </div>
  );
}

function DevisPreview({ devisData, inventory, registerUndoManager }) {
  const [isLayoutEdit, setIsLayoutEdit] = useState(false);
  const [selectedImageId, setSelectedImageId] = useState(null);
  const [layoutResetKey, setLayoutResetKey] = useState(0);
  const [minPages, setMinPages] = useState(1);
  const pageRefs = useRef({});
  const docContainerRef = useRef(null);

  const quoteUndo = useUndoRedo(initialQuoteState(), 30);
  const { present, setPresent, commit, undo, redo, canUndo, canRedo } = quoteUndo;
  const { layoutOffsets, pastedImages } = present;

  const getBlockData = (id) => layoutOffsets[id] || { pageIndex: 0, x: 0, y: 0 };
  const maxPageFromBlocks = Math.max(0, ...Object.values(layoutOffsets).map((o) => (o?.pageIndex ?? 0)));
  const maxPageFromImages = Math.max(0, ...pastedImages.map((img) => img.pageIndex ?? 0));
  const pageCount = Math.max(minPages, maxPageFromBlocks + 1, maxPageFromImages + 1);

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

  const findPageUnderPoint = useCallback((clientX, clientY) => {
    for (let pi = 0; pi < pageCount; pi++) {
      const el = pageRefs.current[pi];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
        return pi;
      }
    }
    return null;
  }, [pageCount]);

  const screenToPageCoords = useCallback((clientX, clientY, pageIndex) => {
    const el = pageRefs.current[pageIndex];
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return {
      x: clientX - rect.left - PAGE_PADDING,
      y: clientY - rect.top - PAGE_PADDING,
    };
  }, []);

  const clampToPage = useCallback((x, y, w, h) => {
    const maxX = Math.max(0, CONTENT_W - (w || 0));
    const maxY = Math.max(0, CONTENT_H - (h || 0));
    return {
      x: Math.max(0, Math.min(maxX, x)),
      y: Math.max(0, Math.min(maxY, y)),
    };
  }, []);

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
            const newImg = {
              id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `img-${Date.now()}`,
              src: ev.target.result,
              x: Math.floor(CONTENT_W / 2 - 100),
              y: Math.floor(CONTENT_H / 2 - 75),
              w: 200,
              h: 150,
              pageIndex: 0,
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
            img.id === id ? { ...img, ...updates, pageIndex: updates.pageIndex ?? img.pageIndex ?? 0 } : img
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

  const handleBlockDragStart = useCallback((id) => commit(), [commit]);

  const handleBlockDrag = useCallback(
    (id, e, d, applyClamp = false) => {
      const block = getBlockData(id);
      const pageIndex = block.pageIndex ?? 0;
      
      const pageEl = pageRefs.current[pageIndex];
      const wrapper = pageEl?.querySelector(`[data-block-wrapper-id="${id}"]`);
      const wrapperRect = wrapper?.getBoundingClientRect();
      const w = wrapperRect?.width || 0;
      const h = wrapperRect?.height || 0;

      const hoveredPage = findPageUnderPoint(e.clientX, e.clientY);
      let targetPage = hoveredPage != null ? hoveredPage : pageIndex;
      let newX;
      let newY;

      if (hoveredPage !== null && hoveredPage !== pageIndex) {
        const coords = screenToPageCoords(e.clientX, e.clientY, hoveredPage);
        newX = coords.x;
        newY = coords.y;
        targetPage = hoveredPage;
      } else {
        newX = d.x - PAGE_PADDING;
        newY = d.y - PAGE_PADDING;
      }

      if (applyClamp && (w || h)) {
        const c = clampToPage(newX, newY, w, h);
        newX = c.x;
        newY = c.y;
      }

      if (targetPage >= pageCount) {
        setMinPages((p) => Math.max(p, targetPage + 1));
      }

      setPresent((prev) => {
        const nextLayout = {
          ...prev.layoutOffsets,
          [id]: { pageIndex: targetPage, x: newX, y: newY },
        };
        if (applyClamp) saveLayout(nextLayout);
        return { ...prev, layoutOffsets: nextLayout };
      }, applyClamp ? { commit: true } : {});
    },
    [setPresent, findPageUnderPoint, screenToPageCoords, clampToPage, pageCount]
  );

  const handleImageDrag = useCallback(
    (imgId, e, d, applyClamp = false) => {
      const img = pastedImages.find((i) => i.id === imgId);
      if (!img) return;
      const pageIndex = img.pageIndex ?? 0;

      const hoveredPage = findPageUnderPoint(e.clientX, e.clientY);
      let targetPage = hoveredPage != null ? hoveredPage : pageIndex;
      let newX = d.x;
      let newY = d.y;

      if (hoveredPage !== null && hoveredPage !== pageIndex) {
        const coords = screenToPageCoords(e.clientX, e.clientY, hoveredPage);
        newX = coords.x;
        newY = coords.y;
        targetPage = hoveredPage;
      }

      if (applyClamp) {
        const w = img.w ?? 200;
        const h = img.h ?? 150;
        const c = clampToPage(newX, newY, w, h);
        newX = c.x;
        newY = c.y;
      }

      if (targetPage >= pageCount) {
        setMinPages((p) => Math.max(p, targetPage + 1));
      }

      updateImage(imgId, { x: newX, y: newY, pageIndex: targetPage }, applyClamp ? { commit: true, saveImmediate: true } : {});
    },
    [pastedImages, findPageUnderPoint, screenToPageCoords, clampToPage, updateImage, pageCount]
  );

  const handleImageResize = useCallback(
    (imgId, ref, position) => {
      updateImage(imgId, {
        w: parseInt(ref.style.width, 10),
        h: parseInt(ref.style.height, 10),
        x: position.x,
        y: position.y,
      });
    },
    [updateImage]
  );

  const handleImageResizeStop = useCallback(
    (imgId, w, h, x, y) => {
      updateImage(imgId, { w, h, x, y }, { commit: true, saveImmediate: true });
    },
    [updateImage]
  );

  const handleFinishEdit = useCallback(() => {
    saveLayout(layoutOffsets);
    saveImages(pastedImages);
    setIsLayoutEdit(false);
    setSelectedImageId(null);
  }, [layoutOffsets, pastedImages]);

  const handleResetLayout = useCallback(() => {
    localStorage.removeItem(LAYOUT_KEY);
    setPresent((prev) => ({ ...prev, layoutOffsets: {} }), { commit: false });
    setMinPages(1);
    setLayoutResetKey((k) => k + 1);
  }, [setPresent]);

  const handleAddPage = useCallback(() => {
    setMinPages((p) => p + 1);
  }, []);

  const initLayoutFromFlow = useCallback(() => {
    if (Object.keys(layoutOffsets).length > 0) return;
    const timer = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const init = {};
        for (let pi = 0; pi < pageCount; pi++) {
          const pageEl = pageRefs.current[pi];
          if (!pageEl) continue;
          BLOCK_IDS.forEach((id) => {
            const wrapper = pageEl.querySelector(`[data-block-wrapper-id="${id}"]`);
            if (wrapper) {
              const pageRect = pageEl.getBoundingClientRect();
              const rect = wrapper.getBoundingClientRect();
              init[id] = {
                pageIndex: pi,
                x: rect.left - pageRect.left - PAGE_PADDING,
                y: rect.top - pageRect.top - PAGE_PADDING,
              };
            }
          });
        }
        if (Object.keys(init).length > 0) {
          setPresent((prev) => ({ ...prev, layoutOffsets: init }), { commit: false });
        }
      });
    });
    return () => cancelAnimationFrame(timer);
  }, [layoutOffsets, pageCount, setPresent]);

  useEffect(() => {
    if (!devisData || Object.keys(layoutOffsets).length > 0) return;
    const t = setTimeout(initLayoutFromFlow, 100);
    return () => clearTimeout(t);
  }, [devisData, layoutOffsets, initLayoutFromFlow]);

  const reflowOverflow = useCallback(() => {
    if (!docContainerRef.current) return;
    const newLayout = { ...layoutOffsets };
    let changed = false;

    for (let pi = 0; pi < pageCount; pi++) {
      const pageEl = pageRefs.current[pi];
      if (!pageEl) continue;

      for (const id of BLOCK_IDS) {
        const block = layoutOffsets[id] || { pageIndex: 0, x: 0, y: 0 };
        if ((block.pageIndex ?? 0) !== pi) continue;

        const wrapper = pageEl.querySelector(`[data-block-wrapper-id="${id}"]`);
        if (!wrapper) continue;

        const rect = wrapper.getBoundingClientRect();
        const pageRect = pageEl.getBoundingClientRect();
        const blockBottom = rect.bottom - pageRect.top - PAGE_PADDING;
        const maxY = CONTENT_H - MARGIN_BOTTOM;

        if (blockBottom > maxY) {
          const nextPage = pi + 1;
          newLayout[id] = { ...block, pageIndex: nextPage, x: block.x ?? 0, y: PAGE_PADDING };
          changed = true;
          if (nextPage >= pageCount) setMinPages((p) => Math.max(p, nextPage + 1));
        }
      }
    }

    if (changed) {
      setPresent((prev) => ({ ...prev, layoutOffsets: newLayout }), { commit: false });
    }
  }, [layoutOffsets, pageCount, setPresent]);

  useEffect(() => {
    if (!devisData) return;
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(() => requestAnimationFrame(reflowOverflow));
    });
    const container = docContainerRef.current;
    if (container) {
      const wrappers = container.querySelectorAll('[data-block-wrapper-id]');
      wrappers.forEach((el) => ro.observe(el));
    }
    return () => ro.disconnect();
  }, [devisData, reflowOverflow, layoutOffsets, pageCount]);

  if (!devisData) {
    return (
      <div className="devis-preview">
        <div className="preview-loading">Chargement...</div>
      </div>
    );
  }

  const totalTTC = calculerTotalDevis(devisData);
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
  const montantTransport = km * TARIF_KM;
  const datePresta = devisData.dateDebutPrestation || devisData.date;
  const detailMateriel = formule?.setId ? getItemsBySet(inventory || {}, formule.setId, datePresta) : [];

  const renderBlockContent = (id) => {
    const common = { 'data-block-id': id };

    switch (id) {
      case 'headerTitle':
        return (
          <div className="header-left" {...common}>
            <h1>DEVIS</h1>
            <div className="devis-info">
              <p><strong>N° :</strong> {devisData.numero || '—'}</p>
              <p><strong>Date :</strong> {dateDevis}</p>
              <p><strong>Valide jusqu'au :</strong> {dateValidite}</p>
            </div>
          </div>
        );
      case 'companyCard':
        return (
          <div className="header-right" {...common}>
            <div className="entreprise-box">
              <h3>{ent.nom || 'Votre Entreprise'}</h3>
              <p>{ent.adresse}</p>
              <p>{ent.codePostal} {ent.ville}</p>
              {ent.telephone && <p>Tél : {ent.telephone}</p>}
              {ent.email && <p>Email : {ent.email}</p>}
              {ent.siret && <p>SIRET : {ent.siret}</p>}
              {ent.codeAPE && <p>Code APE : {ent.codeAPE}</p>}
              {ent.tva && <p>TVA : {ent.tva}</p>}
            </div>
          </div>
        );
      case 'billedTo':
        return (
          <div className="client-section" {...common}>
            <h3>Facturé à :</h3>
            <div className="client-box">
              <p><strong>{client.nom || 'Nom du client'}</strong></p>
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
                  <tr>
                    <td>{formule.label}</td>
                    <td className="num">1</td>
                    <td className="num">{(formule.prixTTC / 1.2).toFixed(2)} €</td>
                    <td className="num">20 %</td>
                    <td className="num">{formule.prixTTC.toFixed(2)} €</td>
                  </tr>
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
                    <td>Transport ({km} km × {TARIF_KM} €/km)</td>
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
        if (detailMateriel.length === 0) return null;
        return (
          <div className="detail-materiel-section" {...common}>
            <h4>Détail du matériel inclus (Set {formule.setId})</h4>
            <ul>
              {detailMateriel.map((item) => (
                <li key={item.id}>
                  {item.qty > 1 ? `${item.qty} × ` : ''}{item.name}
                </li>
              ))}
            </ul>
          </div>
        );
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
        return (
          <div className="devis-footer" {...common}>
            <p>Merci de votre confiance !</p>
          </div>
        );
      default:
        return null;
    }
  };

  const blockContents = {};
  BLOCK_IDS.forEach((id) => {
    const block = getBlockData(id);
    const content = renderBlockContent(id);
    if (content) {
      blockContents[id] = { block, content };
    }
  });

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
          <>
            <button type="button" className="toolbar-btn" onClick={handleResetLayout}>
              Réinitialiser
            </button>
            <button type="button" className="toolbar-btn" onClick={handleAddPage}>
              + Ajouter une page
            </button>
          </>
        )}
        <button type="button" className="toolbar-btn" onClick={() => window.print()} title="Imprimer / Export PDF">
          🖨️ Imprimer
        </button>
        {isLayoutEdit && (
          <span className="toolbar-hint">Ctrl+V pour coller une image</span>
        )}
      </div>
      <div className="preview-container" ref={docContainerRef}>
        <div className="pages-container">
          {Array.from({ length: pageCount }, (_, slotIndex) => {
            const pageIndex = slotIndex;
            const blocksOnPage = BLOCK_IDS.filter((id) => (getBlockData(id).pageIndex ?? 0) === pageIndex);
            return (
              <LayoutPage
                key={`page-${pageIndex}`}
                pageIndex={pageIndex}
                blocksOnPage={blocksOnPage}
                blockContents={blockContents}
                isLayoutEdit={isLayoutEdit}
                pastedImages={pastedImages}
                onBlockDragStart={handleBlockDragStart}
                onBlockDrag={handleBlockDrag}
                onBlockDragStop={handleBlockDrag}
                onImageDrag={handleImageDrag}
                onImageDragStop={handleImageDrag}
                onImageResize={handleImageResize}
                onImageResizeStop={handleImageResizeStop}
                onImageDelete={deleteImage}
                selectedImageId={selectedImageId}
                setSelectedImageId={setSelectedImageId}
                updateImage={updateImage}
                clampToPage={clampToPage}
                commit={commit}
                pageRef={(el) => { pageRefs.current[pageIndex] = el; }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default DevisPreview;
