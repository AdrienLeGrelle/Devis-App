import React, { useState, useEffect } from 'react';
import './PricePerKmModal.css';

function PricePerKmModal({ currentPrice, onSave, onClose }) {
  const [value, setValue] = useState(currentPrice?.toString() || '0.60');
  const [error, setError] = useState('');

  useEffect(() => {
    setValue(currentPrice?.toString() || '0.60');
  }, [currentPrice]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const parsed = parseFloat(value);
    if (isNaN(parsed)) {
      setError('Valeur invalide');
      return;
    }
    if (parsed < 0) {
      setError('Le prix doit être >= 0');
      return;
    }
    onSave(parsed);
    onClose();
  };

  const handleCancel = () => {
    setValue(currentPrice?.toString() || '0.60');
    onClose();
  };

  return (
    <div className="price-km-modal-overlay" onClick={onClose}>
      <div className="price-km-modal" onClick={(e) => e.stopPropagation()}>
        <div className="price-km-modal-header">
          <h3>⚙️ Frais de déplacement</h3>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <form className="price-km-modal-body" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="pricePerKm">Prix au km (€ / km)</label>
            <input
              id="pricePerKm"
              type="number"
              min="0"
              step="0.01"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError('');
              }}
              autoFocus
            />
            {error && <p className="form-error">{error}</p>}
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={handleCancel}>
              Annuler
            </button>
            <button type="submit" className="btn-save">
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PricePerKmModal;
