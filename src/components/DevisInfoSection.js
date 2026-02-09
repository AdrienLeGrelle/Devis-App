import React from 'react';

export function formatNumeroFromDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `DEV-${y}${m}${day}`;
}

function DevisInfoSection({ devisData, onChange, onDateChange }) {
  const displayNumero = devisData.numero || formatNumeroFromDate(devisData.date);

  return (
    <div>
      <div className="form-group">
        <label>Numéro de devis *</label>
        <input
          type="text"
          value={displayNumero}
          onChange={(e) => onChange(null, 'numero', e.target.value)}
          placeholder="DEV-20260130"
          required
        />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Date *</label>
          <input
            type="date"
            value={devisData.date}
            onChange={(e) => (onDateChange ? onDateChange(e.target.value) : onChange(null, 'date', e.target.value))}
            required
          />
        </div>
        <div className="form-group">
          <label>Validité (jours) *</label>
          <input
            type="number"
            value={devisData.validite}
            onChange={(e) => onChange(null, 'validite', parseInt(e.target.value) || 30)}
            min="1"
            required
          />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Date de début prestation</label>
          <input
            type="date"
            value={devisData.dateDebutPrestation || ''}
            onChange={(e) => onChange(null, 'dateDebutPrestation', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Horaire prestation</label>
          <input
            type="text"
            value={devisData.horairePrestation || ''}
            onChange={(e) => onChange(null, 'horairePrestation', e.target.value)}
            placeholder="19h - 2h"
          />
        </div>
      </div>
      <div className="form-group">
        <label>Lieu de la prestation</label>
        <input
          type="text"
          value={devisData.lieuPrestation || ''}
          onChange={(e) => onChange(null, 'lieuPrestation', e.target.value)}
          placeholder="Granville"
        />
      </div>
    </div>
  );
}

export default DevisInfoSection;


