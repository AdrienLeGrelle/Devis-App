import React from 'react';
import DocumentRenderer from './DocumentRenderer';
import './DevisPreview.css';

/**
 * Aperçu du devis. Affiche DocumentRenderer dans un container gris avec pages A4 physiques.
 * L'export PDF utilise window.print() sur le même HTML/CSS (identité preview = PDF).
 */
function DevisPreview({ devisData, inventory, pricePerKm = 0.60 }) {
  const handlePrint = () => {
    window.print();
  };

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
        <button
          type="button"
          className="toolbar-btn"
          onClick={handlePrint}
          title="Imprimer / Export PDF"
        >
          🖨️ Imprimer / PDF
        </button>
      </div>
      <div className="preview-container">
        <div className="preview-pages-wrapper">
          <DocumentRenderer
            devisData={devisData}
            inventory={inventory}
            pricePerKm={pricePerKm}
          />
        </div>
      </div>
    </div>
  );
}

export default DevisPreview;
