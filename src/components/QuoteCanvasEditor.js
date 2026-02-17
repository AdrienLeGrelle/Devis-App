import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import './QuoteCanvasEditor.css';
import { resolveFieldValue } from '../utils/quoteFieldResolver';
import { PAGE_A4, saveLayout, getDefaultLayout } from '../utils/quoteLayout';

const GRID = 8;

function QuoteCanvasEditor({ layout, onLayoutChange, devisData, inventory, pricePerKm = 0.60 }) {
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [locked, setLocked] = useState(false);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const items = layout?.items || [];
  const page = layout?.page || PAGE_A4;

  const updateItem = useCallback(
    (id, updates) => {
      onLayoutChange({
        ...layout,
        items: items.map((it) => (it.id === id ? { ...it, ...updates } : it)),
      });
    },
    [layout, items, onLayoutChange]
  );

  const addImage = useCallback(
    (src, w = 200, h = 150) => {
      const newItem = {
        id: `img-${Date.now()}`,
        type: 'image',
        src,
        x: 100,
        y: 100,
        w,
        h,
        zIndex: Math.max(0, ...items.map((i) => i.zIndex || 0)) + 1,
      };
      onLayoutChange({ ...layout, items: [...items, newItem] });
    },
    [layout, items, onLayoutChange]
  );

  const handlePaste = useCallback(
    (e) => {
      if (!editMode) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          const reader = new FileReader();
          reader.onload = (ev) => addImage(ev.target.result, 200, 150);
          reader.readAsDataURL(file);
          break;
        }
      }
    },
    [editMode, addImage]
  );

  const handleDrop = useCallback(
    (e) => {
      if (!editMode) return;
      e.preventDefault();
      const files = e.dataTransfer?.files;
      if (!files?.length) return;
      const file = Array.from(files).find((f) => f.type.startsWith('image/'));
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => addImage(ev.target.result, 200, 150);
      reader.readAsDataURL(file);
    },
    [editMode, addImage]
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const handleAddImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file?.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => addImage(ev.target.result, 200, 150);
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const deleteItem = (id) => {
    onLayoutChange({ ...layout, items: items.filter((it) => it.id !== id) });
    setSelectedId(null);
  };

  const bringForward = (id) => {
    const maxZ = Math.max(...items.map((i) => i.zIndex || 0));
    updateItem(id, { zIndex: maxZ + 1 });
  };

  const sendBackward = (id) => {
    const minZ = Math.min(...items.map((i) => i.zIndex || 0));
    updateItem(id, { zIndex: minZ - 1 });
  };

  const handlePrint = () => {
    setEditMode(false);
    setTimeout(() => window.print(), 100);
  };

  const renderItemContent = (item) => {
    if (item.type === 'image') {
      return <img src={item.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />;
    }
    if (item.type === 'field') {
      const value = resolveFieldValue(item.fieldKey, devisData, inventory, pricePerKm);
      const style = item.style || {};
      const baseStyle = {
        fontSize: style.fontSize || 12,
        fontWeight: style.fontWeight || 400,
        color: style.color || '#333',
        textAlign: style.textAlign || 'left',
        overflow: 'auto',
        width: '100%',
        height: '100%',
      };
      if (value?.type === 'table' && value.rows?.length) {
        const numStyle = { 
          padding: 6, 
          textAlign: 'right', 
          whiteSpace: 'nowrap', 
          fontVariantNumeric: 'tabular-nums',
          fontFeatureSettings: '"tnum"',
          wordBreak: 'keep-all',
          overflow: 'visible'
        };
        return (
          <table className="quote-articles-table" style={{ ...baseStyle, fontSize: 11, width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#667eea', color: 'white' }}>
                <th style={{ padding: 6, textAlign: 'left' }}>Désignation</th>
                <th style={numStyle}>Qté</th>
                <th style={numStyle}>Prix unit. HT</th>
                <th style={numStyle}>TVA</th>
                <th style={numStyle}>Total TTC</th>
              </tr>
            </thead>
            <tbody>
              {value.rows.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #e0e0e0' }}>
                  <td style={{ padding: 6 }}>{r.designation}</td>
                  <td style={numStyle}>{r.qty}</td>
                  <td style={numStyle}>{r.pu}\u00A0€</td>
                  <td style={numStyle}>{r.tva.replace(' ', '\u00A0')}</td>
                  <td style={numStyle}>{r.total}\u00A0€</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      }
      return (
        <div style={{ ...baseStyle, whiteSpace: 'pre-wrap' }}>
          {typeof value === 'string' ? value : value?.toString?.() || '—'}
        </div>
      );
    }
    if (item.type === 'text') {
      return <div style={{ whiteSpace: 'pre-wrap' }}>{item.content || ''}</div>;
    }
    return null;
  };

  const snap = (v) => Math.round(v / GRID) * GRID;

  return (
    <div className="quote-canvas-editor">
      <div className="canvas-toolbar">
        <label className="toolbar-toggle">
          <input type="checkbox" checked={editMode} onChange={(e) => setEditMode(e.target.checked)} />
          Éditer la mise en page
        </label>
        {editMode && (
          <>
            <label className="toolbar-toggle">
              <input type="checkbox" checked={locked} onChange={(e) => setLocked(e.target.checked)} />
              Verrouiller
            </label>
            <button type="button" onClick={handleAddImageClick}>
              + Image
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
          </>
        )}
        <button type="button" onClick={handlePrint}>
          Imprimer / PDF
        </button>
        <button type="button" onClick={() => onLayoutChange && onLayoutChange(getDefaultLayout())}>
          Réinitialiser
        </button>
        {layout && (
          <button
            type="button"
            onClick={() => {
              saveLayout(layout);
              alert('Layout sauvegardé');
            }}
          >
            Sauvegarder
          </button>
        )}
      </div>

      <div
        ref={canvasRef}
        className="canvas-page-wrapper"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div
          className="canvas-page"
          style={{
            width: page.width,
            height: page.height,
            padding: page.padding,
            background: page.background || '#fff',
          }}
        >
          {items
            .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
            .map((item) => {
              const isSelected = selectedId === item.id;
              const isLocked = locked || item.locked;
              const canDrag = editMode && !isLocked;

              if (editMode) {
                return (
                  <Rnd
                    key={item.id}
                    size={{ width: item.w, height: item.h }}
                    position={{ x: item.x, y: item.y }}
                    onDragStop={(e, d) => updateItem(item.id, { x: snap(d.x), y: snap(d.y) })}
                    onResizeStop={(e, direction, ref, delta, position) => {
                      updateItem(item.id, {
                        w: snap(parseInt(ref.style.width, 10)),
                        h: snap(parseInt(ref.style.height, 10)),
                        x: snap(position.x),
                        y: snap(position.y),
                      });
                    }}
                    onMouseDown={() => setSelectedId(item.id)}
                    enableResizing={!isLocked}
                    disableDragging={!canDrag}
                    bounds="parent"
                    scale={1}
                    dragGrid={[GRID, GRID]}
                    resizeGrid={[GRID, GRID]}
                    style={{ zIndex: item.zIndex || 1 }}
                    className={`canvas-item ${isSelected ? 'selected' : ''}`}
                  >
                    <div className="canvas-item-content">{renderItemContent(item)}</div>
                    {isSelected && !isLocked && (
                      <div className="canvas-item-actions">
                        <button type="button" onClick={() => deleteItem(item.id)} title="Supprimer">
                          ×
                        </button>
                        <button type="button" onClick={() => bringForward(item.id)} title="Avant">
                          ↑
                        </button>
                        <button type="button" onClick={() => sendBackward(item.id)} title="Arrière">
                          ↓
                        </button>
                      </div>
                    )}
                  </Rnd>
                );
              }

              return (
                <div
                  key={item.id}
                  className="canvas-item canvas-item-static"
                  style={{
                    position: 'absolute',
                    left: item.x,
                    top: item.y,
                    width: item.w,
                    height: item.h,
                    zIndex: item.zIndex || 1,
                  }}
                >
                  <div className="canvas-item-content">{renderItemContent(item)}</div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

export default QuoteCanvasEditor;
