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

const PAGE_W = 794;
const PAGE_H = 1123;
const PADDING = 48;
const MARGIN_BOTTOM = 48;

const BLOCK_IDS = [
  'headerTitle',
  'companyCard',
  'headerSeparator',
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
        const item = { x: val.x ?? 0, y: val.y ?? 0 };
        if (val.w != null && typeof val.w === 'number') item.w = val.w;
        migrated[id] = item;
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

const initialQuoteState = () => ({
  layoutOffsets: loadLayout() || {},
  pastedImages: loadImages(),
});

const SAVE_DEBOUNCE_MS = 300;

function DevisPreview({ devisData, inventory, registerUndoManager }) {
  const [isLayoutEdit, setIsLayoutEdit] = useState(false);
  const [selectedImageId, setSelectedImageId] = useState(null);
  const [blockOrigins, setBlockOrigins] = useState({});
  const [layoutResetKey, setLayoutResetKey] = useState(0);
  const pageRef = useRef(null);

  const quoteUndo = useUndoRedo(initialQuoteState(), 50);
  const { present, setPresent, commit, undo, redo, canUndo, canRedo } = quoteUndo;
  const { layoutOffsets, pastedImages } = present;

  const getBlockData = (id) => layoutOffsets[id] || { x: 0, y: 0, w: undefined };

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
            const newImg = {
              id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `img-${Date.now()}`,
              src: ev.target.result,
              x: 100,
              y: 100,
              w: 200,
              h: 150,
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

  const handleLayoutDragStart = useCallback(() => commit(), [commit]);

  const handleLayoutDrag = useCallback(
    (id, e, d, orig) => {
      const newX = d.x;
      const newY = d.y;
      setPresent((prev) => {
        const existing = prev.layoutOffsets[id] || {};
        const nextLayout = {
          ...prev.layoutOffsets,
          [id]: { ...existing, x: newX, y: newY },
        };
        return { ...prev, layoutOffsets: nextLayout };
      }, {});
    },
    [setPresent]
  );

  const handleLayoutDragStop = useCallback(
    (id, e, d, orig) => {
      const newX = d.x;
      const newY = d.y;
      setPresent((prev) => {
        const existing = prev.layoutOffsets[id] || {};
        const nextLayout = {
          ...prev.layoutOffsets,
          [id]: { ...existing, x: newX, y: newY },
        };
        saveLayout(nextLayout);
        return { ...prev, layoutOffsets: nextLayout };
      }, { commit: true });
    },
    [setPresent]
  );

  const handleImageDrag = useCallback(
    (imgId, d) => {
      const newX = d.x;
      const newY = d.y;
      updateImage(imgId, { x: newX, y: newY }, {});
    },
    [updateImage]
  );

  const handleImageDragStop = useCallback(
    (imgId, d) => {
      const newX = d.x;
      const newY = d.y;
      updateImage(imgId, { x: newX, y: newY }, { commit: true, saveImmediate: true });
    },
    [updateImage]
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

  useEffect(() => {
    if (!isLayoutEdit) {
      setBlockOrigins({});
      return;
    }
    const timer = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const container = pageRef.current;
        if (!container) return;
        const containerRect = container.getBoundingClientRect();
        const blocks = {};
        BLOCK_IDS.forEach((id) => {
          const el = container.querySelector(`[data-block-id="${id}"]`);
          if (el) {
            const rect = el.getBoundingClientRect();
            const offset = layoutOffsets[id] || { x: 0, y: 0 };
            const x = rect.left - containerRect.left - PADDING;
            const y = rect.top - containerRect.top - PADDING;
            blocks[id] = {
              x,
              y,
              w: rect.width,
              h: rect.height,
              baseX: x - (offset.x || 0),
              baseY: y - (offset.y || 0),
            };
          }
        });
        if (Object.keys(blocks).length > 0) setBlockOrigins(blocks);
      });
    });
    return () => cancelAnimationFrame(timer);
  }, [isLayoutEdit, layoutResetKey, layoutOffsets]);

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

  const getBlockTransform = (id) => {
    const o = getBlockData(id);
    if (!o || (o.x === 0 && o.y === 0)) return undefined;
    return `translate(${o.x}px, ${o.y}px)`;
  };

  const renderBlock = (id) => {
    const transform = getBlockTransform(id);
    const style = transform ? { transform } : undefined;
    const common = { key: id, 'data-block-id': id, style };

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
        <div className="page-wrapper">
          <div
            ref={pageRef}
            className="page"
            style={{
              width: PAGE_W,
              height: PAGE_H,
              padding: PADDING,
            }}
          >
            <div className="page-inner">
              <div className="devis-header">
                {renderBlock('headerTitle')}
                {renderBlock('companyCard')}
              </div>
              {renderBlock('headerSeparator')}
              {renderBlock('billedTo')}
              {renderBlock('itemsTable')}
              {renderBlock('materielDetail')}
              {renderBlock('totalBox')}
              {renderBlock('notesSection')}
              {renderBlock('footerSection')}
            </div>

            {isLayoutEdit && Object.keys(blockOrigins).length > 0 && (
              <div
                className="layout-overlay"
                style={{
                  pointerEvents: 'none',
                  top: PADDING,
                  left: PADDING,
                  right: PADDING,
                  bottom: PADDING,
                }}
              >
                {Object.entries(blockOrigins).map(([id, orig]) => {
                  const offset = getBlockData(id);
                  const baseX = orig.baseX ?? orig.x - (offset.x || 0);
                  const baseY = orig.baseY ?? orig.y - (offset.y || 0);
                  return (
                    <Draggable
                      key={id}
                      position={{ x: offset.x || 0, y: offset.y || 0 }}
                      positionOffset={{ x: baseX, y: baseY }}
                      onStart={handleLayoutDragStart}
                      onDrag={(e, d) => handleLayoutDrag(id, e, d, orig)}
                      onStop={(e, d) => handleLayoutDragStop(id, e, d, orig)}
                      handle=".layout-drag-handle"
                      cancel="input,textarea,select,button,a"
                    >
                      <div
                        className="layout-overlay-frame"
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          width: orig.w,
                          height: orig.h,
                          pointerEvents: 'auto',
                        }}
                      >
                        <span className="layout-drag-handle" title="Glisser" />
                      </div>
                    </Draggable>
                  );
                })}
              </div>
            )}

            {pastedImages.map((img) => (
              <Rnd
                key={img.id}
                size={{ width: img.w ?? 200, height: img.h ?? 150 }}
                position={{ x: img.x ?? 100, y: img.y ?? 100 }}
                onDragStart={() => commit()}
                onDrag={(e, d) => handleImageDrag(img.id, d)}
                onDragStop={(e, d) => handleImageDragStop(img.id, d)}
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
        </div>
      </div>
    </div>
  );
}

export default DevisPreview;
