import React, { useState, useEffect, useRef, useCallback } from 'react';
import DocumentRenderer from './DocumentRenderer';
import { getDefaultDocLayout, loadDocLayout, saveDocLayout } from '../utils/docLayout';
import './DevisPreview.css';

/**
 * Aperçu = DocumentRenderer. "Modifier la mise en page" active le mode édition sur le même rendu :
 * rien ne bouge, les blocs deviennent déplaçables (poignées + bordures en pointillés).
 * Possibilité d'ajouter des images déplaçables (glisser-déposer, copier-coller, bouton).
 */
const DevisPreview = React.forwardRef(function DevisPreview(
  { devisData, inventory, pricePerKm = 0.60 },
  ref
) {
  const [editLayoutMode, setEditLayoutMode] = useState(false);
  const [docLayout, setDocLayout] = useState(() => {
    const saved = loadDocLayout();
    const layout = saved || getDefaultDocLayout();
    if (!layout.images) layout.images = [];
    return layout;
  });
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);

  // Sauvegarde automatique à chaque modification du layout (position image, blocs, etc.)
  // pour que les images restent au même endroit après changement d'option ou retour à l'aperçu
  useEffect(() => {
    if (docLayout) saveDocLayout(docLayout);
  }, [docLayout]);

  const addImage = useCallback((src, w = 200, h = 150) => {
    if (!docLayout) return;
    const newImage = {
      id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      src,
      x: 100,
      y: 100,
      w,
      h,
    };
    setDocLayout({
      ...docLayout,
      images: [...(docLayout.images || []), newImage],
    });
  }, [docLayout]);

  const handlePaste = useCallback((e) => {
    if (!editLayoutMode) return;
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
  }, [editLayoutMode, addImage]);

  const handleDrop = useCallback((e) => {
    if (!editLayoutMode) return;
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (!files?.length) return;
    const file = Array.from(files).find((f) => f.type.startsWith('image/'));
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => addImage(ev.target.result, 200, 150);
    reader.readAsDataURL(file);
  }, [editLayoutMode, addImage]);

  const handleDragOver = useCallback((e) => {
    if (!editLayoutMode) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, [editLayoutMode]);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file?.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => addImage(ev.target.result, 200, 150);
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  }, [addImage]);

  useEffect(() => {
    if (editLayoutMode) {
      document.addEventListener('paste', handlePaste);
      return () => document.removeEventListener('paste', handlePaste);
    }
  }, [editLayoutMode, handlePaste]);

  if (!devisData) {
    return (
      <div className="devis-preview">
        <div className="preview-loading">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="devis-preview">
      <div className="preview-toolbar preview-ui">
        {editLayoutMode ? (
          <>
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => setEditLayoutMode(false)}
              title="Retour à l'aperçu"
            >
              ← Retour à l'aperçu
            </button>
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Ajouter une image"
            >
              + Image
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => setDocLayout(getDefaultDocLayout())}
              title="Réinitialiser les positions"
            >
              Réinitialiser
            </button>
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => {
                if (docLayout) {
                  saveDocLayout(docLayout);
                  alert('Mise en page sauvegardée');
                }
              }}
              title="Sauvegarder les positions"
            >
              Sauvegarder
            </button>
          </>
        ) : (
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => setEditLayoutMode(true)}
            title="Modifier la mise en page"
          >
            ✏️ Modifier la mise en page
          </button>
        )}
      </div>
      <div
        ref={containerRef}
        className="preview-container"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div className="preview-pages-wrapper">
          <DocumentRenderer
            ref={ref}
            devisData={devisData}
            inventory={inventory}
            pricePerKm={pricePerKm}
            editLayoutMode={editLayoutMode}
            docLayout={docLayout}
            onDocLayoutChange={setDocLayout}
          />
        </div>
      </div>
    </div>
  );
});

export default DevisPreview;
